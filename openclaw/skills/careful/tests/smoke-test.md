# Smoke Test — careful skill

## Test 1 — Safe rm (build artifact)

```bash
echo '{"tool":"exec","tool_input":{"command":"rm -rf node_modules"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/careful/bin/check-careful.sh
```

**Expected:** `{"decision":"allow","pattern":"rm_safe_artifact","warning":""}`

## Test 2 — Destructive rm (non-build target)

```bash
echo '{"tool":"exec","tool_input":{"command":"rm -rf /var/data/old-logs"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/careful/bin/check-careful.sh
```

**Expected:** `{"decision":"ask","pattern":"rm_recursive","warning":"Recursive delete (rm -r). This permanently removes files. Confirm with Adam before proceeding."}`

## Test 3 — SQL DROP

```bash
echo '{"tool":"exec","tool_input":{"command":"psql -c \"DROP TABLE users;\""}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/careful/bin/check-careful.sh
```

**Expected:** `{"decision":"ask","pattern":"drop_table","warning":"SQL DROP detected..."}`

## Test 4 — git force push

```bash
echo '{"tool":"exec","tool_input":{"command":"git push --force origin main"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/careful/bin/check-careful.sh
```

**Expected:** `{"decision":"ask","pattern":"git_force_push","warning":"git force-push rewrites remote history..."}`

## Test 5 — Read-only command

```bash
echo '{"tool":"exec","tool_input":{"command":"ls -la /tmp"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/careful/bin/check-careful.sh
```

**Expected:** `{"decision":"allow","pattern":"none","warning":""}`

## Test 6 — TRUNCATE

```bash
echo '{"tool":"exec","tool_input":{"command":"mysql -e \"TRUNCATE TABLE orders;\""}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/careful/bin/check-careful.sh
```

**Expected:** `{"decision":"ask","pattern":"truncate","warning":"SQL TRUNCATE detected..."}`

## Test 7 — kubectl delete

```bash
echo '{"tool":"exec","tool_input":{"command":"kubectl delete pod nginx-1"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/careful/bin/check-careful.sh
```

**Expected:** `{"decision":"ask","pattern":"kubectl_delete","warning":"kubectl delete removes Kubernetes resources..."}`

## Test 8 — Mixed safe + unsafe targets

```bash
echo '{"tool":"exec","tool_input":{"command":"rm -rf node_modules /tmp/important"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/careful/bin/check-careful.sh
```

**Expected:** `{"decision":"ask","pattern":"rm_recursive","warning":"Recursive delete..."}` (because /tmp/important is not in safe list)

## Test 9 — Empty command (fail-open)

```bash
echo '{"tool":"exec","tool_input":{}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/careful/bin/check-careful.sh
```

**Expected:** `{"decision":"allow","pattern":"none","warning":""}` (fail-open when command is empty)

## Test 10 — Malformed JSON (fail-open)

```bash
echo "not json" \
  | bash /home/openclaw/.openclaw/workspace/skills/careful/bin/check-careful.sh
```

**Expected:** `{"decision":"allow","pattern":"none","warning":""}` (fail-open on parse error)

## Pass criteria

All 10 tests must produce the expected output exactly. If any test fails, the skill is NOT READY-TO-ACTIVATE and requires fixes.

## Run all tests

```bash
for i in 1 2 3 4 5 6 7 8 9 10; do
  echo "=== Test $i ==="
  # (test command from above)
done
```

Or use the bundled runner: `tests/run-all.sh` (if present).