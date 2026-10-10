// Shared types for the $B memory diagnostic command and the /memory
// endpoint. Lives in its own module so server.ts, read-commands.ts, and
// the extension footer poll can import without taking a circular dep on
// browser-manager.ts.
//
// Background: the gbrowser-OOM investigation (160 GB Activity Monitor
// reading on a friend's machine) needed a diagnostic that could land
// before the next incident — measurement comes first, fixes come after.
// $B memory is that diagnostic.

/** Counts/bytes for the bounded in-memory structures on the Bun side. */
export interface MemoryStructureStats {
  modificationHistory: { current: number; cap: number; evicted: number };
  activitySubscribers: number;
  inspectorSubscribers: number;
  consoleBufferLen: number;
  networkBufferLen: number;
  dialogBufferLen: number;
  captureBufferBytes: number;
}

/** Extension MV3 service worker JS heap. Null means the target was seen but not measured. */
export interface MemoryServiceWorkerSnapshot {
  url: string;
  jsHeapUsed: number | null;
  jsHeapTotal: number | null;
}

/** Per-tab JS heap snapshot (CDP Performance.getMetrics). */
export interface MemoryTabSnapshot {
  id: number;
  url: string;
  title: string;
  jsHeapUsed: number;
  jsHeapTotal: number;
  documents: number;
  nodes: number;
  listeners: number;
}

/** Chromium process metadata via CDP SystemInfo.getProcessInfo. */
export interface MemoryProcess {
  /** Chromium-internal process id (not OS PID). */
  id: number;
  /** 'browser' | 'renderer' | 'gpu' | 'utility' | 'extension' | ... */
  type: string;
  /** CPU time accumulated since process start (seconds). */
  cpuTime: number;
}

export interface MemorySnapshot {
  bunServer: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  tabs: MemoryTabSnapshot[];
  /**
   * Extension service workers (`chrome-extension://`), separate from tabs.
   * Omitted only by older fixtures; new snapshots always set an array.
   */
  serviceWorkers?: MemoryServiceWorkerSnapshot[];
  /**
   * Chromium process tree. `null` when no browser handle is available
   * (server in connection mode, or browser not yet launched).
   *
   * Per-process RSS is NOT included: SystemInfo.getProcessInfo returns
   * id+type+cpuTime but Chromium does not expose RSS via CDP. The
   * `notes[]` field tells the caller why — see the follow-up TODO
   * "native/GPU memory breakdown" for the deferred fix.
   */
  processes: MemoryProcess[] | null;
  structures: MemoryStructureStats;
  capturedAt: number;
  notes: string[];
}

export interface ExtensionWorkerTarget {
  targetId: string;
  type: string;
  url: string;
}

export interface ExtensionWorkerMetric {
  targetId: string;
  ok: boolean;
  jsHeapUsed?: number;
  jsHeapTotal?: number;
}

const EXTENSION_WORKER_URL = 'chrome-extension://';

/**
 * Turn a CDP target list into the public serviceWorkers snapshot.
 * A missing session is not the same result as a successful query that
 * found zero extension workers.
 */
export function projectExtensionServiceWorkers(input: {
  sessionAvailable: boolean;
  targets: ExtensionWorkerTarget[];
  metrics: ExtensionWorkerMetric[];
}): { serviceWorkers: MemoryServiceWorkerSnapshot[]; notes: string[] } {
  if (!input.sessionAvailable) {
    return {
      serviceWorkers: [],
      notes: ['service worker targets unavailable'],
    };
  }

  const metricsById = new Map(input.metrics.map((metric) => [metric.targetId, metric]));
  const serviceWorkers: MemoryServiceWorkerSnapshot[] = [];
  let heapUnavailable = false;
  for (const target of input.targets) {
    if (target.type !== 'service_worker') continue;
    if (!target.url.startsWith(EXTENSION_WORKER_URL)) continue;
    const metric = metricsById.get(target.targetId);
    if (!metric?.ok || typeof metric.jsHeapUsed !== 'number' || typeof metric.jsHeapTotal !== 'number') {
      heapUnavailable = true;
      serviceWorkers.push({ url: target.url, jsHeapUsed: null, jsHeapTotal: null });
      continue;
    }
    serviceWorkers.push({
      url: target.url,
      jsHeapUsed: metric.jsHeapUsed,
      jsHeapTotal: metric.jsHeapTotal,
    });
  }

  return {
    serviceWorkers,
    notes: heapUnavailable ? ['service worker heap unavailable'] : [],
  };
}

export interface ExtensionWorkerCdpSession {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  detach?(): Promise<void>;
  attachToTarget?(targetId: string): Promise<ExtensionWorkerCdpSession>;
  on?(event: string, listener: (payload: { sessionId?: string; message?: string }) => void): void;
  off?(event: string, listener: (payload: { sessionId?: string; message?: string }) => void): void;
}

type TargetInfo = { targetId?: string; type?: string; url?: string };

function heapFromMetrics(result: { metrics?: Array<{ name: string; value: number }> } | null): {
  jsHeapUsed: number;
  jsHeapTotal: number;
} {
  const metrics: Record<string, number> = {};
  for (const metric of result?.metrics ?? []) metrics[metric.name] = metric.value;
  if (typeof metrics.JSHeapUsedSize !== 'number' || typeof metrics.JSHeapTotalSize !== 'number') {
    throw new Error('JS heap metrics missing');
  }
  return { jsHeapUsed: metrics.JSHeapUsedSize, jsHeapTotal: metrics.JSHeapTotalSize };
}

function heapFromUsage(result: { usedSize?: number; totalSize?: number } | null): {
  jsHeapUsed: number;
  jsHeapTotal: number;
} {
  if (typeof result?.usedSize !== 'number' || typeof result?.totalSize !== 'number') {
    throw new Error('heap usage missing');
  }
  return { jsHeapUsed: result.usedSize, jsHeapTotal: result.totalSize };
}

async function readWorkerHeapViaTunnel(
  session: ExtensionWorkerCdpSession,
  targetId: string,
): Promise<{ jsHeapUsed: number; jsHeapTotal: number }> {
  const attached = await session.send('Target.attachToTarget', { targetId, flatten: false }) as { sessionId?: string };
  const sessionId = attached?.sessionId;
  if (!sessionId) throw new Error('attach failed');
  const commandId = 1;
  let listener: ((payload: { sessionId?: string; message?: string }) => void) | null = null;
  try {
    const reply = new Promise<{ usedSize?: number; totalSize?: number }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('heap reply timed out')), 1000);
      listener = (payload) => {
        if (payload.sessionId !== sessionId || !payload.message) return;
        let parsed: { id?: number; error?: { message?: string }; result?: { usedSize?: number; totalSize?: number } };
        try {
          parsed = JSON.parse(payload.message);
        } catch {
          return;
        }
        if (parsed.id !== commandId) return;
        clearTimeout(timer);
        if (parsed.error) reject(new Error(parsed.error.message ?? 'heap reply failed'));
        else resolve(parsed.result ?? {});
      };
      session.on?.('Target.receivedMessageFromTarget', listener);
    });
    await session.send('Target.sendMessageToTarget', {
      sessionId,
      message: JSON.stringify({ id: commandId, method: 'Runtime.getHeapUsage' }),
    });
    return heapFromUsage(await reply);
  } finally {
    if (listener) session.off?.('Target.receivedMessageFromTarget', listener);
    await session.send('Target.detachFromTarget', { sessionId }).catch(() => undefined);
  }
}

async function readWorkerHeap(
  session: ExtensionWorkerCdpSession,
  targetId: string,
): Promise<{ jsHeapUsed: number; jsHeapTotal: number }> {
  if (typeof session.attachToTarget !== 'function') {
    return readWorkerHeapViaTunnel(session, targetId);
  }
  const child = await session.attachToTarget(targetId);
  try {
    await Promise.resolve(child.send('Performance.enable')).catch(() => undefined);
    const result = await child.send('Performance.getMetrics') as {
      metrics?: Array<{ name: string; value: number }>;
    };
    return heapFromMetrics(result);
  } finally {
    await child.detach?.().catch(() => undefined);
  }
}

/**
 * List extension service workers through a browser CDP session.
 * `null` means the session itself could not be opened.
 */
export async function collectExtensionServiceWorkers(
  session: ExtensionWorkerCdpSession | null,
): Promise<{ serviceWorkers: MemoryServiceWorkerSnapshot[]; notes: string[] }> {
  if (!session) {
    return projectExtensionServiceWorkers({ sessionAvailable: false, targets: [], metrics: [] });
  }
  let infos: TargetInfo[];
  try {
    const listed = await session.send('Target.getTargets') as { targetInfos?: TargetInfo[] };
    infos = listed?.targetInfos ?? [];
  } catch {
    return projectExtensionServiceWorkers({ sessionAvailable: false, targets: [], metrics: [] });
  }

  const targets: ExtensionWorkerTarget[] = [];
  for (const info of infos) {
    if (!info.targetId || !info.type || !info.url) continue;
    targets.push({ targetId: info.targetId, type: info.type, url: info.url });
  }
  const metrics: ExtensionWorkerMetric[] = [];
  for (const target of targets) {
    if (target.type !== 'service_worker' || !target.url.startsWith(EXTENSION_WORKER_URL)) continue;
    try {
      const heap = await readWorkerHeap(session, target.targetId);
      metrics.push({ targetId: target.targetId, ok: true, ...heap });
    } catch {
      metrics.push({ targetId: target.targetId, ok: false });
    }
  }
  return projectExtensionServiceWorkers({ sessionAvailable: true, targets, metrics });
}

/** Format bytes as a short human string ("1.4 GB", "312 MB", "84 KB"). */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
