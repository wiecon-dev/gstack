# Smoke Test — dx-audit skill

## Test 1 — Run audit on current workspace

Invoke the skill with target path `/home/openclaw/.openclaw/workspace` and product type `tool`.

**Expected:** skill returns a markdown scorecard with 8 dimensions scored 0-10, evidence quotes, TTHW estimate, and a verdict.

## Test 2 — Verify evidence requirement

Inspect the scorecard. Every dimension must cite a file path or command output.

**Expected:** no bare numeric scores without evidence.

## Test 3 — Prioritized roadmap

The report must include a "Top 3 Gaps" section with actionable fixes.

**Expected:** 3 numbered gaps, each with a fix recommendation.

## Test 4 — No browser/live credentials

Confirm the skill did not use `browser`, `web_fetch`, or any external API.

**Expected:** no browser tool calls in the audit trace.

## Pass criteria

- All 8 dimensions scored
- Evidence present for every score
- TTHW estimate included
- Verdict line present (DX_GOOD / DX_NEEDS_WORK / DX_BROKEN)
- No live web calls
