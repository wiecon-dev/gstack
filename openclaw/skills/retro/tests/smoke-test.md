# Smoke Test — retro

## Test 1: Trigger activation
- **Input:** Adam says "what shipped this week"
- **Expected:** Agent activates retro skill, analyzes commit history
- **Result:** PASS

## Test 2: Commit analysis
- **Input:** Agent analyzes recent commits
- **Expected:** Agent provides structured summary (what shipped, what's in progress, blockers)
- **Result:** PASS

## Test 3: Team awareness
- **Input:** Agent analyzes multi-person commits
- **Expected:** Agent identifies per-person contributions, praise, and growth areas
- **Result:** PASS

## Test 4: Non-activation
- **Input:** Adam says "write me a function"
- **Expected:** retro does NOT activate
- **Result:** PASS
