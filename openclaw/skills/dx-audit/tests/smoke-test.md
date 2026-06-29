:# Smoke Test — dx-audit skill

## Test 1 — Run audit on current workspace

Invoke the skill with target path `/home/openclaw/.openclaw/workspace` and product type `tool`.

**Expected:** skill returns a markdown scorecard with 8 dimensions scored 0-10, evidence quotes, TTHW estimate, and a verdict.

## Test 2 — Verify evidence requirement

Inspect the scorecard. Every dimension must cite a file path or command output.

**Expected:** no bare numeric scores without evidence.

## Test 3 — Verify 8 dimensions

The scorecard must include these exact 8 dimension names:
1. Getting Started
2. API/CLI/SDK Ergonomics
3. Error Messages
4. Documentation
5. Upgrade Path
6. Developer Environment
7. Community & Ecosystem
8. DX Measurement & Feedback

**Expected:** all 8 dimensions present with non-zero scores or N/A.

## Test 4 — Prioritized roadmap

The report must include a "Top 3 Gaps" section with actionable fixes.

**Expected:** 3 numbered gaps, each with a fix recommendation.

## Test 5 — No browser/live credentials

Confirm the skill did not use `browser`, `web_fetch`, or any external API.

**Expected:** no browser tool calls in the audit trace.

## Pass criteria

- All 8 dimensions scored
- Evidence present for every score
- 8 dimension names match the canonical list
- TTHW estimate included
- Verdict line present (DX_GOOD / DX_NEEDS_WORK / DX_BROKEN)
- No live web calls
