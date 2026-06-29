#!/usr/bin/env python3
"""
render-diagram.py — Render mermaid source into SVG, PNG, and Excalidraw artifacts.

Uses the vendored gstack diagram-render bundle (diagram-render.html) and
Playwright/Chromium to render offline. This replaces gstack's browse daemon
for OpenClaw runtime.

Usage:
    python3 render-diagram.py --mmd input.mmd --outdir ./out [--slug mydiagram]

Outputs (in outdir):
    - {slug}.mmd     (copy of input)
    - {slug}.svg     (rendered SVG)
    - {slug}.png     (PNG at 1950px width)
    - {slug}.excalidraw  (only for flowchart/graph LR/RL/TD/BT)

Exit codes:
    0 — success
    1 — rendering error
    2 — bundle missing
    3 — invalid arguments
"""

import argparse
import base64
import json
import os
import shutil
import sys
import time
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError as e:
    print(json.dumps({"error": f"playwright not installed: {e}"}), file=sys.stderr)
    sys.exit(1)


def get_bundle_path():
    skill_dir = Path(__file__).resolve().parent.parent
    bundle = skill_dir / "lib" / "diagram-render.html"
    if bundle.exists():
        return str(bundle)
    # fallback to gstack checkout
    fallback = Path("/srv/samba/openclaw/github_forks/gstack/lib/diagram-render/dist/diagram-render.html")
    if fallback.exists():
        return str(fallback)
    return None


def serve_bundle(bundle_path, port=0):
    """Start a tiny http server for the bundle directory; return (server, url)."""
    import http.server
    import socketserver
    import threading

    bundle_dir = Path(bundle_path).parent

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(bundle_dir), **kwargs)

        def log_message(self, format, *args):
            pass

    server = socketserver.TCPServer(("127.0.0.1", port), Handler)
    actual_port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{actual_port}/diagram-render.html"
    return server, url


def wait_for_done(page, timeout_ms=30000):
    try:
        page.wait_for_selector("#done", state="attached", timeout=timeout_ms)
        return True
    except PWTimeout:
        return False


def is_flowchart(mermaid_src):
    lowered = mermaid_src.lower().strip()
    for keyword in ["graph lr", "graph rl", "graph td", "graph bt", "graph tb", "flowchart"]:
        if lowered.startswith(keyword) or ("\n" + keyword) in lowered:
            return True
    return False


def render_artifacts(mmd_path, outdir, slug=None):
    bundle_path = get_bundle_path()
    if not bundle_path:
        return {"error": "diagram-render.html bundle missing", "exit_code": 2}

    outdir = Path(outdir).resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    if slug is None:
        slug = Path(mmd_path).stem

    mmd_path = Path(mmd_path).resolve()
    if not mmd_path.exists():
        return {"error": f"mmd file not found: {mmd_path}", "exit_code": 3}

    mermaid_src = mmd_path.read_text(encoding="utf-8")
    mmd_out = outdir / f"{slug}.mmd"
    svg_out = outdir / f"{slug}.svg"
    png_out = outdir / f"{slug}.png"
    excalidraw_out = outdir / f"{slug}.excalidraw"

    # Copy .mmd output (skip if same file)
    if mmd_path != mmd_out:
        shutil.copy2(mmd_path, mmd_out)

    server, url = serve_bundle(bundle_path)
    try:
        with sync_playwright() as p:
            # prefer system chromium if available
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            page.goto(url, wait_until="networkidle", timeout=60000)

            if not wait_for_done(page, timeout_ms=30000):
                html = page.content()
                return {"error": "render bundle did not signal ready (#done)", "html_snippet": html[:500], "exit_code": 1}

            # base64 encode source for safe JS injection
            src_b64 = base64.b64encode(mermaid_src.encode("utf-8")).decode("ascii")

            # render SVG (using Playwright safe arg passing)
            svg_text = page.evaluate("([id_name, src]) => window.__renderMermaid(id_name, src)", ("diagram-1", mermaid_src))
            if isinstance(svg_text, dict) and "error" in svg_text:
                return {"error": f"mermaid render error: {svg_text.get('error')}", "exit_code": 1}
            if not isinstance(svg_text, str):
                svg_text = str(svg_text)
            svg_out.write_text(svg_text, encoding="utf-8")

            # render PNG (rasterize SVG at width 1950)
            png_b64 = page.evaluate("([svg, width]) => window.__rasterize(svg, width)", (svg_text, 1950))
            if isinstance(png_b64, str) and png_b64.startswith("data:image/png;base64,"):
                png_b64 = png_b64.split(",", 1)[1]
            png_bytes = base64.b64decode(png_b64)
            png_out.write_bytes(png_bytes)

            # render Excalidraw (flowchart only)
            excalidraw_ok = False
            if is_flowchart(mermaid_src):
                try:
                    scene_result = page.evaluate("([src]) => window.__mermaidToExcalidraw(src)", (mermaid_src,))
                    if isinstance(scene_result, str):
                        excalidraw_out.write_text(scene_result, encoding="utf-8")
                        excalidraw_ok = True
                except Exception as e:
                    excalidraw_ok = False

            browser.close()

            return {
                "success": True,
                "slug": slug,
                "outdir": str(outdir),
                "files": {
                    "mmd": str(mmd_out),
                    "svg": str(svg_out),
                    "png": str(png_out),
                    "excalidraw": str(excalidraw_out) if excalidraw_ok else None,
                },
                "is_flowchart": is_flowchart(mermaid_src),
                "excalidraw_rendered": excalidraw_ok,
            }
    finally:
        server.shutdown()


def main():
    parser = argparse.ArgumentParser(description="Render mermaid to SVG/PNG/excalidraw")
    parser.add_argument("--mmd", required=True, help="Path to .mmd source file")
    parser.add_argument("--outdir", required=True, help="Output directory")
    parser.add_argument("--slug", default=None, help="Base name for output files")
    args = parser.parse_args()

    result = render_artifacts(args.mmd, args.outdir, args.slug)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if "error" in result:
        sys.exit(result.get("exit_code", 1))
    sys.exit(0)


if __name__ == "__main__":
    main()
