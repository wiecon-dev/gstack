# Smoke Test — freeze skill

## Setup

```bash
mkdir -p /tmp/freeze-test/{inside,outside}
touch /tmp/freeze-test/inside/foo.py /tmp/freeze-test/outside/bar.py
```

## Test 1 — Set boundary

```bash
bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/freeze-set.sh /tmp/freeze-test/inside
```

**Expected:** `{"decision":"set","boundary":"/tmp/freeze-test/inside/"}`

## Test 2 — Show boundary

```bash
bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/freeze-set.sh --show
```

**Expected:** `{"decision":"active","boundary":"/tmp/freeze-test/inside/"}`

## Test 3 — Within boundary (allowed)

```bash
echo '{"tool":"write","tool_input":{"file_path":"/tmp/freeze-test/inside/foo.py","content":"hello"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/check-freeze.sh
```

**Expected:** `{"decision":"allow","reason":"within_freeze_boundary"}`

## Test 4 — Outside boundary (denied)

```bash
echo '{"tool":"write","tool_input":{"file_path":"/tmp/freeze-test/outside/bar.py","content":"hello"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/check-freeze.sh
```

**Expected:** `{"decision":"deny","reason":"outside_freeze_boundary","file_path":"/tmp/freeze-test/outside/bar.py","boundary":"/tmp/freeze-test/inside/"}`

## Test 5 — Sibling directory (denied, trailing slash prevents collision)

```bash
echo '{"tool":"write","tool_input":{"file_path":"/tmp/freeze-test/inside-old/foo.py","content":"hello"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/check-freeze.sh
```

**Expected:** `{"decision":"deny","reason":"outside_freeze_boundary",...}` (because boundary is `/tmp/freeze-test/inside/`, not `/tmp/freeze-test/inside`)

## Test 6 — Clear (unfreeze)

```bash
bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/freeze-set.sh --clear
bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/freeze-set.sh --show
```

**Expected:** clear returns `{"decision":"cleared","boundary":""}`, show returns `{"decision":"inactive","boundary":""}`

## Test 7 — Freeze inactive (allow)

After Test 6, with no state file:

```bash
echo '{"tool":"write","tool_input":{"file_path":"/anywhere/file.py","content":"x"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/check-freeze.sh
```

**Expected:** `{"decision":"allow","reason":"freeze_not_active"}`

## Test 8 — Edit tool (denied outside boundary)

Re-set boundary, then test edit:

```bash
bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/freeze-set.sh /tmp/freeze-test/inside
echo '{"tool":"edit","tool_input":{"file_path":"/tmp/freeze-test/outside/bar.py","new_text":"x"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/check-freeze.sh
```

**Expected:** `{"decision":"deny","reason":"outside_freeze_boundary",...}`

## Test 9 — Relative path resolution

```bash
cd /tmp/freeze-test
echo '{"tool":"write","tool_input":{"file_path":"./inside/foo.py","content":"x"}}' \
  | bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/check-freeze.sh
```

**Expected:** `{"decision":"allow","reason":"within_freeze_boundary"}` (relative resolved to absolute)

## Test 10 — Malformed JSON (fail-open)

```bash
echo "not json" \
  | bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/check-freeze.sh
```

**Expected:** `{"decision":"allow","reason":"parse_error_fail_open"}`

## Pass criteria

All 10 tests must produce the expected output exactly. Cleanup after:

```bash
rm -rf /tmp/freeze-test
bash /home/openclaw/.openclaw/workspace/skills/freeze/bin/freeze-set.sh --clear
```