import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  createEvalRunId,
  finishEvalAttempt,
  readEvalLifecycleJournal,
  recordEvalProgress,
  startEvalAttempt,
  summarizeEvalLifecycle,
} from './eval-lifecycle';
import { EvalCollector, getPartialEvalFiles } from './eval-store';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-lifecycle-'));
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

describe('eval lifecycle journal', () => {
  test('creates filesystem-safe run IDs that remain unique within one process', () => {
    const first = createEvalRunId();
    const second = createEvalRunId();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  test('writes START before model execution and emits an immediate stderr line', () => {
    const journalPath = path.join(tmpDir, 'lifecycle.jsonl');
    const stderrLines: string[] = [];

    const attempt = startEvalAttempt({
      runId: 'run-1',
      testName: 'review-sql-injection',
      journalPath,
      attemptId: 'attempt-1',
      now: () => new Date('2026-10-10T07:40:00.000Z'),
      writeStderr: (line) => stderrLines.push(line),
    });

    const records = fs.readFileSync(journalPath, 'utf8').trim().split('\n').map(JSON.parse);
    expect(attempt.attemptId).toBe('attempt-1');
    expect(records).toEqual([{
      schema_version: 1,
      event: 'start',
      run_id: 'run-1',
      attempt_id: 'attempt-1',
      test_name: 'review-sql-injection',
      timestamp: '2026-10-10T07:40:00.000Z',
      status: 'running',
    }]);
    expect(stderrLines).toEqual(['[eval] START review-sql-injection (attempt-1)\n']);
  });

  test('writes exactly one matching END record and immediate PASS line', () => {
    const journalPath = path.join(tmpDir, 'lifecycle.jsonl');
    const stderrLines: string[] = [];
    const attempt = startEvalAttempt({
      runId: 'run-1', testName: 'review-sql-injection', journalPath,
      attemptId: 'attempt-1',
      now: () => new Date('2026-10-10T07:40:00.000Z'),
      writeStderr: (line) => stderrLines.push(line),
    });

    const first = finishEvalAttempt(attempt, {
      passed: true,
      durationMs: 12_345,
      exitReason: 'success',
      now: () => new Date('2026-10-10T07:40:12.345Z'),
      writeStderr: (line) => stderrLines.push(line),
    });
    const second = finishEvalAttempt(attempt, {
      passed: true,
      durationMs: 12_345,
      exitReason: 'success',
      writeStderr: (line) => stderrLines.push(line),
    });

    const records = fs.readFileSync(journalPath, 'utf8').trim().split('\n').map(JSON.parse);
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(records).toHaveLength(2);
    expect(records[1]).toEqual({
      schema_version: 1,
      event: 'end',
      run_id: 'run-1',
      attempt_id: 'attempt-1',
      test_name: 'review-sql-injection',
      timestamp: '2026-10-10T07:40:12.345Z',
      status: 'pass',
      duration_ms: 12_345,
      exit_reason: 'success',
    });
    expect(stderrLines.at(-1)).toBe('[eval] PASS review-sql-injection (attempt-1) 12.3s success\n');
  });

  test('writes FAIL with a normalized exit reason and no private payload fields', () => {
    const journalPath = path.join(tmpDir, 'lifecycle.jsonl');
    const attempt = startEvalAttempt({
      runId: 'run-2', testName: 'qa-timeout', journalPath, attemptId: 'attempt-2',
      writeStderr: () => {},
    });

    finishEvalAttempt(attempt, {
      passed: false, durationMs: 90_000, exitReason: 'timeout', writeStderr: () => {},
    });

    const end = fs.readFileSync(journalPath, 'utf8').trim().split('\n').map(JSON.parse).at(-1);
    expect(end.status).toBe('fail');
    expect(end.exit_reason).toBe('timeout');
    expect(JSON.stringify(end)).not.toContain('prompt');
    expect(JSON.stringify(end)).not.toContain('output');
    expect(JSON.stringify(end)).not.toContain('env');
  });

  test('normalizes an arbitrary SDK subtype before persisting or printing it', () => {
    const journalPath = path.join(tmpDir, 'lifecycle.jsonl');
    const stderrLines: string[] = [];
    const attempt = startEvalAttempt({
      runId: 'run-private', testName: 'sdk-failure', journalPath,
      attemptId: 'attempt-private', writeStderr: (line) => stderrLines.push(line),
    });

    finishEvalAttempt(attempt, {
      passed: false,
      durationMs: 500,
      exitReason: 'internal_error: user@example.com',
      writeStderr: (line) => stderrLines.push(line),
    });

    const end = readEvalLifecycleJournal(journalPath).at(-1);
    expect(end?.exit_reason).toBe('error_other');
    expect(JSON.stringify(end)).not.toContain('user@example.com');
    expect(stderrLines.at(-1)).toContain('error_other');
    expect(stderrLines.at(-1)).not.toContain('user@example.com');
  });

  test('observability I/O failure warns but does not fail the evaluated test', () => {
    const parentFile = path.join(tmpDir, 'not-a-directory');
    fs.writeFileSync(parentFile, 'occupied');
    const stderrLines: string[] = [];

    expect(() => startEvalAttempt({
      runId: 'run-3', testName: 'io-failure',
      journalPath: path.join(parentFile, 'lifecycle.jsonl'),
      attemptId: 'attempt-3',
      writeStderr: (line) => stderrLines.push(line),
    })).not.toThrow();

    expect(stderrLines).toContain('[eval] START io-failure (attempt-3)\n');
    expect(stderrLines.some((line) => line.includes('WARN observability write failed'))).toBe(true);
  });

  test('collector persists a completed result before writing its matching END', () => {
    const evalDir = path.join(tmpDir, 'evals');
    const journalPath = path.join(tmpDir, 'lifecycle.jsonl');
    const attempt = startEvalAttempt({
      runId: 'run-4', testName: 'collector-test', journalPath,
      attemptId: 'attempt-4', writeStderr: () => {},
    });
    const collector = new EvalCollector('e2e', evalDir);

    collector.addTest({
      name: 'collector-test', suite: 'test', tier: 'e2e', passed: true,
      duration_ms: 100, cost_usd: 0, exit_reason: 'success',
    }, attempt);

    const records = fs.readFileSync(journalPath, 'utf8').trim().split('\n').map(JSON.parse);
    expect(records.map((record) => record.event)).toEqual(['start', 'end']);
    expect(records[1].status).toBe('pass');
    expect(getPartialEvalFiles(evalDir)).toHaveLength(1);
  });

  test('reads concurrent progress records and ignores an incomplete final JSONL line', () => {
    const journalPath = path.join(tmpDir, 'lifecycle.jsonl');
    const first = startEvalAttempt({
      runId: 'run-5', testName: 'first', journalPath, attemptId: 'attempt-a',
      now: () => new Date('2026-10-10T07:00:00.000Z'), writeStderr: () => {},
    });
    const second = startEvalAttempt({
      runId: 'run-5', testName: 'second', journalPath, attemptId: 'attempt-b',
      now: () => new Date('2026-10-10T07:00:01.000Z'), writeStderr: () => {},
    });
    recordEvalProgress(first, {
      turn: 2, toolCount: 3, lastTool: 'Read',
      now: () => new Date('2026-10-10T07:05:00.000Z'),
    });
    finishEvalAttempt(second, {
      passed: false, durationMs: 4_000, exitReason: 'timeout',
      now: () => new Date('2026-10-10T07:00:05.000Z'), writeStderr: () => {},
    });
    fs.appendFileSync(journalPath, '{"event":"broken"');

    const records = readEvalLifecycleJournal(journalPath);
    const attempts = summarizeEvalLifecycle(records, new Date('2026-10-10T07:06:00.000Z').getTime(), 600);

    expect(records).toHaveLength(4);
    expect(attempts.map((attempt) => [attempt.testName, attempt.status])).toEqual([
      ['first', 'running'],
      ['second', 'fail'],
    ]);
    expect(attempts[0].lastTool).toBe('Read');
  });
});
