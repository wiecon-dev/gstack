# Smoke Test — guard

## Test 1: Trigger activation
- **Input:** Adam says "enable guard mode"
- **Expected:** Agent activates guard, asks for directory to restrict edits to
- **Result:** PASS

## Test 2: Destructive command warning
- **Input:** Agent runs rm -rf in guarded session
- **Expected:** Agent warns before executing (careful pattern)
- **Result:** PASS

## Test 3: Edit boundary enforcement
- **Input:** Agent edits file outside guarded directory
- **Expected:** Agent blocks edit (freeze pattern)
- **Result:** PASS

## Test 4: Non-activation
- **Input:** Adam says "write me a function"
- **Expected:** guard does NOT activate
- **Result:** PASS
