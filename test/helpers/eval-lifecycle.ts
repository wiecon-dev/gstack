import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface EvalAttempt {
  runId: string;
  attemptId: string;
  testName: string;
  journalPath: string;
  startedAt: string;
}

export interface StartEvalAttemptOptions {
  runId: string;
  testName: string;
  journalPath: string;
  attemptId?: string;
  now?: () => Date;
  writeStderr?: (line: string) => void;
}

export interface FinishEvalAttemptOptions {
  passed: boolean;
  durationMs: number;
  exitReason: string;
  now?: () => Date;
  writeStderr?: (line: string) => void;
}

export interface EvalLifecycleRecord {
  schema_version: number;
  event: 'start' | 'progress' | 'end';
  run_id: string;
  attempt_id: string;
  test_name: string;
  timestamp: string;
  status: 'running' | 'pass' | 'fail';
  duration_ms?: number;
  exit_reason?: string;
  turn?: number;
  tool_count?: number;
  last_tool?: string;
}

export interface EvalAttemptSummary {
  runId: string;
  attemptId: string;
  testName: string;
  status: 'running' | 'stale' | 'pass' | 'fail';
  startedAt: string;
  lastSignalAt: string;
  durationMs?: number;
  exitReason?: string;
  turn?: number;
  toolCount?: number;
  lastTool?: string;
}

const finishedAttempts = new WeakSet<EvalAttempt>();
const attemptWriters = new WeakMap<EvalAttempt, (line: string) => void>();

export function createEvalRunId(now: Date = new Date()): string {
  const timestamp = now.toISOString().replace(/[:.]/g, '').replace('T', '-');
  return `${timestamp}-${process.pid}-${randomUUID().slice(0, 8)}`;
}

const KNOWN_EXIT_REASONS = new Set([
  'success',
  'timeout',
  'failed',
  'unknown',
  'error_api',
  'error_during_execution',
  'error_max_turns',
  'error_max_budget_usd',
  'rate_limit_exhausted',
  'rate_limit_retry',
]);

export function normalizeEvalExitReason(reason: string): string {
  if (KNOWN_EXIT_REASONS.has(reason)) return reason;
  if (/^exit_code_-?\d+$/.test(reason)) return reason;
  return 'error_other';
}

function safeWriteStderr(writeStderr: (line: string) => void, line: string): void {
  try { writeStderr(line); } catch { /* observability must not change the eval result */ }
}

function appendRecord(
  journalPath: string,
  record: Record<string, unknown>,
  writeStderr: (line: string) => void,
): boolean {
  try {
    fs.mkdirSync(path.dirname(journalPath), { recursive: true });
    fs.appendFileSync(journalPath, JSON.stringify(record) + '\n');
    return true;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : 'unknown';
    safeWriteStderr(writeStderr, `[eval] WARN observability write failed (${code})\n`);
    return false;
  }
}

export function startEvalAttempt(options: StartEvalAttemptOptions): EvalAttempt {
  const now = options.now ?? (() => new Date());
  const writeStderr = options.writeStderr ?? ((line: string) => process.stderr.write(line));
  const attemptId = options.attemptId ?? randomUUID();
  const startedAt = now().toISOString();

  const record = {
    schema_version: 1,
    event: 'start',
    run_id: options.runId,
    attempt_id: attemptId,
    test_name: options.testName,
    timestamp: startedAt,
    status: 'running',
  };

  safeWriteStderr(writeStderr, `[eval] START ${options.testName} (${attemptId})\n`);
  appendRecord(options.journalPath, record, writeStderr);

  const attempt = {
    runId: options.runId,
    attemptId,
    testName: options.testName,
    journalPath: options.journalPath,
    startedAt,
  };
  attemptWriters.set(attempt, writeStderr);
  return attempt;
}

export function finishEvalAttempt(
  attempt: EvalAttempt,
  options: FinishEvalAttemptOptions,
): boolean {
  if (finishedAttempts.has(attempt)) return false;

  const now = options.now ?? (() => new Date());
  const writeStderr = options.writeStderr
    ?? attemptWriters.get(attempt)
    ?? ((line: string) => process.stderr.write(line));
  const status = options.passed ? 'pass' : 'fail';
  const exitReason = normalizeEvalExitReason(options.exitReason);
  const record = {
    schema_version: 1,
    event: 'end',
    run_id: attempt.runId,
    attempt_id: attempt.attemptId,
    test_name: attempt.testName,
    timestamp: now().toISOString(),
    status,
    duration_ms: options.durationMs,
    exit_reason: exitReason,
  };

  appendRecord(attempt.journalPath, record, writeStderr);
  finishedAttempts.add(attempt);
  const label = options.passed ? 'PASS' : 'FAIL';
  safeWriteStderr(writeStderr, `[eval] ${label} ${attempt.testName} (${attempt.attemptId}) ${(options.durationMs / 1000).toFixed(1)}s ${exitReason}\n`);
  return true;
}

export function recordEvalProgress(
  attempt: EvalAttempt,
  options: {
    turn: number;
    toolCount: number;
    lastTool: string;
    now?: () => Date;
    writeStderr?: (line: string) => void;
  },
): void {
  const writeStderr = options.writeStderr
    ?? attemptWriters.get(attempt)
    ?? ((line: string) => process.stderr.write(line));
  appendRecord(attempt.journalPath, {
    schema_version: 1,
    event: 'progress',
    run_id: attempt.runId,
    attempt_id: attempt.attemptId,
    test_name: attempt.testName,
    timestamp: (options.now ?? (() => new Date()))().toISOString(),
    status: 'running',
    turn: options.turn,
    tool_count: options.toolCount,
    last_tool: options.lastTool,
  }, writeStderr);
}

export function readEvalLifecycleJournal(journalPath: string): EvalLifecycleRecord[] {
  let content: string;
  try { content = fs.readFileSync(journalPath, 'utf8'); } catch { return []; }

  const records: EvalLifecycleRecord[] = [];
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line) as EvalLifecycleRecord;
      if (record.schema_version === 1 && record.attempt_id && record.event) records.push(record);
    } catch { /* tolerate an incomplete final append after a hard kill */ }
  }
  return records;
}

export function summarizeEvalLifecycle(
  records: EvalLifecycleRecord[],
  nowMs: number = Date.now(),
  staleThresholdSec: number = 600,
): EvalAttemptSummary[] {
  const attempts = new Map<string, EvalAttemptSummary>();
  for (const record of records) {
    const existing = attempts.get(record.attempt_id);
    if (record.event === 'start') {
      attempts.set(record.attempt_id, {
        runId: record.run_id,
        attemptId: record.attempt_id,
        testName: record.test_name,
        status: 'running',
        startedAt: record.timestamp,
        lastSignalAt: record.timestamp,
      });
      continue;
    }
    if (!existing) continue;
    existing.lastSignalAt = record.timestamp;
    if (record.event === 'progress') {
      existing.turn = record.turn;
      existing.toolCount = record.tool_count;
      existing.lastTool = record.last_tool;
    } else {
      existing.status = record.status === 'pass' ? 'pass' : 'fail';
      existing.durationMs = record.duration_ms;
      existing.exitReason = record.exit_reason;
    }
  }

  for (const attempt of attempts.values()) {
    if (attempt.status !== 'running') continue;
    const ageSec = (nowMs - new Date(attempt.lastSignalAt).getTime()) / 1000;
    if (ageSec > staleThresholdSec) attempt.status = 'stale';
  }
  return [...attempts.values()];
}
