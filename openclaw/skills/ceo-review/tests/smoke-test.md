# Smoke Test — ceo-review

## Test 1: Trigger activation
- **Input:** Adam says "review this plan and challenge it"
- **Expected:** Agent activates ceo-review skill, asks for mode selection (EXPANSION/SELECTIVE/HOLD/REDUCTION)
- **Result:** PASS

## Test 2: Mode selection
- **Input:** Agent presents plan with 4 modes, Adam selects SELECTIVE
- **Expected:** Agent reviews plan in SELECTIVE mode, presents expansion opportunities separately
- **Result:** PASS

## Test 3: HARD GATE
- **Input:** Agent proposes scope expansion without asking Adam
- **Expected:** Agent must ask for explicit opt-in before any scope change
- **Result:** PASS

## Test 4: Non-activation
- **Input:** Adam says "write me a function"
- **Expected:** ceo-review does NOT activate (not a plan review request)
- **Result:** PASS
