/**
 * Live E2E test watcher dashboard.
 *
 * Reads append-only lifecycle journals for active/stale attempts and
 * isolated partial eval results for completed tests. The legacy heartbeat
 * remains a fallback for runs produced by older code.
 * Renders a terminal dashboard every 1s.
 *
 * Usage: bun run eval:watch [--tail]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getProjectEvalDir, loadPartialEvalResults } from '../test/helpers/eval-store';
import {
  readEvalLifecycleJournal,
  summarizeEvalLifecycle,
  type EvalAttemptSummary,
} from '../test/helpers/eval-lifecycle';

const GSTACK_DEV_DIR = path.join(os.homedir(), '.gstack-dev');
const HEARTBEAT_PATH = path.join(GSTACK_DEV_DIR, 'e2e-live.json');
const EVAL_DIR = getProjectEvalDir();
const PROJECT_DIR = path.dirname(EVAL_DIR);
const PARTIAL_PATH = path.join(EVAL_DIR, '_partial');
const STALE_THRESHOLD_SEC = 600; // 10 minutes

export interface HeartbeatData {
  runId: string;
  pid?: number;
  startedAt: string;
  currentTest: string;
  status: string;
  turn: number;
  toolCount: number;
  lastTool: string;
  lastToolAt: string;
  elapsedSec: number;
}

export interface PartialData {
  tests: Array<{
    name: string;
    passed: boolean;
    cost_usd: number;
    duration_ms: number;
    turns_used?: number;
    exit_reason?: string;
  }>;
  total_cost_usd: number;
  _partial?: boolean;
  _run_id?: string;
  timestamp?: string;
}

export function selectWatchState<T extends PartialData>(
  allAttempts: EvalAttemptSummary[],
  allPartials: T[],
): { attempts: EvalAttemptSummary[]; partials: T[] } {
  const activeRunIds = new Set(
    allAttempts
      .filter((attempt) => attempt.status === 'running' || attempt.status === 'stale')
      .map((attempt) => attempt.runId),
  );

  if (activeRunIds.size > 0) {
    return {
      attempts: allAttempts.filter((attempt) => activeRunIds.has(attempt.runId)),
      partials: allPartials.filter((partial) => partial._run_id && activeRunIds.has(partial._run_id)),
    };
  }

  const latestRunId = [...allPartials]
    .filter((partial) => partial._run_id)
    .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))[0]?._run_id;
  if (latestRunId) {
    return {
      attempts: allAttempts.filter((attempt) => attempt.runId === latestRunId),
      partials: allPartials.filter((partial) => partial._run_id === latestRunId),
    };
  }

  return { attempts: [], partials: allPartials.filter((partial) => !partial._run_id) };
}

/** Read and parse a JSON file, returning null on any error. */
function readJSON<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/** Check if a process is alive (signal 0 = existence check, doesn't kill). */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Format seconds as Xm Ys */
function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

/** Render dashboard from heartbeat + partial data. Pure function for testability. */
export function renderDashboard(
  heartbeat: HeartbeatData | null,
  partialInput: PartialData | PartialData[] | null,
  attempts: EvalAttemptSummary[] = [],
): string {
  const lines: string[] = [];
  const partials = partialInput ? (Array.isArray(partialInput) ? partialInput : [partialInput]) : [];
  const completedTests = partials.flatMap((partial) => partial.tests || []);
  const lifecycleActive = attempts.filter((attempt) => attempt.status === 'running');
  const lifecycleStale = attempts.filter((attempt) => attempt.status === 'stale');

  if (!heartbeat && partials.length === 0 && attempts.length === 0) {
    lines.push('E2E Watch — No active run detected');
    lines.push('');
    lines.push(`Heartbeat: ${HEARTBEAT_PATH} (not found)`);
    lines.push(`Partial:   ${PARTIAL_PATH} (not found)`);
    lines.push('');
    lines.push('Start a run with: EVALS=1 bun test test/skill-e2e-*.test.ts');
    return lines.join('\n');
  }

  const runIds = [...new Set(attempts.map((attempt) => attempt.runId))];
  const runId = runIds[0] || heartbeat?.runId || 'unknown';
  const runLabel = runIds.length > 1 ? `${runIds.length} active runs` : runId;
  const elapsed = heartbeat?.elapsedSec || 0;
  lines.push(`E2E Watch \u2014 Run ${runLabel} \u2014 ${formatDuration(elapsed)}`);
  lines.push('\u2550'.repeat(55));

  // Completed tests from partial
  if (completedTests.length > 0) {
    for (const t of completedTests) {
      const icon = t.passed ? '\u2713' : '\u2717';
      const cost = `$${t.cost_usd.toFixed(2)}`;
      const dur = `${Math.round(t.duration_ms / 1000)}s`;
      const turns = t.turns_used !== undefined ? `${t.turns_used} turns` : '';
      const name = t.name.length > 30 ? t.name.slice(0, 27) + '...' : t.name.padEnd(30);
      lines.push(` ${icon} ${name}  ${cost.padStart(6)}  ${dur.padStart(5)}  ${turns}`);
    }
  }

  // Current test from heartbeat
  for (const attempt of [...lifecycleActive, ...lifecycleStale]) {
    const name = attempt.testName.length > 30
      ? attempt.testName.slice(0, 27) + '...'
      : attempt.testName.padEnd(30);
    const lastSignalMs = new Date(attempt.lastSignalAt).getTime();
    const ageSec = Math.max(0, Math.round((Date.now() - lastSignalMs) / 1000));
    const detail = attempt.lastTool
      ? `turn ${attempt.turn ?? 0}   last: ${attempt.lastTool}`
      : 'awaiting first tool';
    lines.push(` ${attempt.status === 'stale' ? '⚠' : '⧖'} ${name}  ${formatDuration(ageSec).padStart(6)}  ${detail}`);
    if (attempt.status === 'stale') lines.push(' ⚠  STALE: no lifecycle signal within the freshness threshold');
  }

  // Legacy fallback when no lifecycle-aware active attempt exists.
  if (lifecycleActive.length === 0 && lifecycleStale.length === 0 && heartbeat && heartbeat.status === 'running') {
    const name = heartbeat.currentTest.length > 30
      ? heartbeat.currentTest.slice(0, 27) + '...'
      : heartbeat.currentTest.padEnd(30);
    lines.push(` \u29D6 ${name}  ${formatDuration(heartbeat.elapsedSec).padStart(6)}  turn ${heartbeat.turn}   last: ${heartbeat.lastTool}`);

    // Stale detection
    const lastToolTime = new Date(heartbeat.lastToolAt).getTime();
    const staleSec = Math.round((Date.now() - lastToolTime) / 1000);
    if (staleSec > STALE_THRESHOLD_SEC) {
      lines.push(` \u26A0  STALE: last tool call was ${formatDuration(staleSec)} ago \u2014 run may have crashed`);
    }
  }

  lines.push('\u2500'.repeat(55));

  // Summary
  const completedCount = completedTests.length;
  const totalCost = partials.reduce((sum, partial) => sum + (partial.total_cost_usd || 0), 0);
  const running = attempts.length > 0
    ? lifecycleActive.length
    : (heartbeat?.status === 'running' ? 1 : 0);
  lines.push(` Completed: ${completedCount}  Running: ${running}  Stale: ${lifecycleStale.length}  Cost: $${totalCost.toFixed(2)}  Elapsed: ${formatDuration(elapsed)}`);

  if (runId !== 'unknown') {
    const logPath = path.join(PROJECT_DIR, 'e2e-runs', runId, 'progress.log');
    lines.push(` Logs: ${logPath}`);
  }

  return lines.join('\n');
}

function findLifecycleJournalFiles(): string[] {
  const runsDir = path.join(PROJECT_DIR, 'e2e-runs');
  try {
    return fs.readdirSync(runsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(runsDir, entry.name, 'lifecycle.jsonl'))
      .filter((file) => fs.existsSync(file));
  } catch {
    return [];
  }
}

// --- Main ---

if (import.meta.main) {
  const showTail = process.argv.includes('--tail');

  const render = () => {
    let heartbeat = readJSON<HeartbeatData>(HEARTBEAT_PATH);
    const allPartials = loadPartialEvalResults(EVAL_DIR);
    const lifecycleRecords = findLifecycleJournalFiles()
      .flatMap((file) => readEvalLifecycleJournal(file));
    const allAttempts = summarizeEvalLifecycle(lifecycleRecords, Date.now(), STALE_THRESHOLD_SEC);
    const { attempts, partials } = selectWatchState(allAttempts, allPartials);

    // Auto-clear heartbeat if the process is dead
    if (heartbeat?.pid && !isProcessAlive(heartbeat.pid)) {
      try { fs.unlinkSync(HEARTBEAT_PATH); } catch { /* already gone */ }
      process.stdout.write('\x1B[2J\x1B[H');
      process.stdout.write(`Cleared stale heartbeat — PID ${heartbeat.pid} is no longer running.\n\n`);
      heartbeat = null;
    }

    // Clear screen
    process.stdout.write('\x1B[2J\x1B[H');
    process.stdout.write(renderDashboard(heartbeat, partials, attempts) + '\n');

    // --tail: show last 10 lines of progress.log
    const activeRunId = attempts.find((attempt) => attempt.status === 'running' || attempt.status === 'stale')?.runId
      ?? heartbeat?.runId;
    if (showTail && activeRunId) {
      const logPath = path.join(PROJECT_DIR, 'e2e-runs', activeRunId, 'progress.log');
      try {
        const content = fs.readFileSync(logPath, 'utf-8');
        const tail = content.split('\n').filter(l => l.trim()).slice(-10);
        process.stdout.write('\nRecent progress:\n');
        for (const line of tail) {
          process.stdout.write(line + '\n');
        }
      } catch { /* log file may not exist yet */ }
    }
  };

  render();
  setInterval(render, 1000);
}
