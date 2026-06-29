# Smoke Test — office-hours

## Test 1: Trigger activation
- **Input:** Adam says "I have an idea for a new feature, let's brainstorm"
- **Expected:** Agent activates office-hours skill, starts structured brainstorming
- **Result:** PASS

## Test 2: Idea evaluation
- **Input:** Agent evaluates an idea
- **Expected:** Agent provides structured evaluation (pros, cons, feasibility, effort)
- **Result:** PASS

## Test 3: No code generation
- **Input:** Agent starts writing code during brainstorming
- **Expected:** Agent should focus on idea quality, not implementation
- **Result:** PASS

## Test 4: Non-activation
- **Input:** Adam says "fix this bug"
- **Expected:** office-hours does NOT activate (not a brainstorming request)
- **Result:** PASS
