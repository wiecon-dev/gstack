# Smoke Test — unfreeze

## Test 1: Trigger activation
- **Input:** Adam says "unfreeze"
- **Expected:** Agent clears freeze boundary
- **Result:** PASS

## Test 2: Clear boundary
- **Input:** Freeze is set to /tmp, agent runs unfreeze
- **Expected:** Freeze boundary cleared, edits allowed everywhere
- **Result:** PASS

## Test 3: No boundary set
- **Input:** No freeze active, agent runs unfreeze
- **Expected:** Agent reports "no freeze boundary was set"
- **Result:** PASS

## Test 4: Non-activation
- **Input:** Unrelated request
- **Expected:** unfreeze does NOT activate
- **Result:** PASS
