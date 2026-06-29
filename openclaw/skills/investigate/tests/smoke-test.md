# Smoke Test — investigate

## Test 1: Trigger activation
- **Input:** Adam says "something is broken, the API returns 500"
- **Expected:** Agent activates investigate skill, starts with Phase 1 (Root Cause Investigation)
- **Result:** PASS

## Test 2: Root cause first
- **Input:** Agent immediately proposes a fix without investigation
- **Expected:** Agent must investigate first (NO FIXES WITHOUT ROOT CAUSE)
- **Result:** PASS

## Test 3: Pattern table
- **Input:** Agent investigates a recurring bug
- **Expected:** Agent uses pattern table to track hypotheses and evidence
- **Result:** PASS

## Test 4: Non-activation
- **Input:** Adam says "what's the weather today"
- **Expected:** investigate does NOT activate
- **Result:** PASS
