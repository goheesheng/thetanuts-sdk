#!/usr/bin/env npx ts-node
/**
 * Indexer Benchmark: Old vs New
 *
 * Compares latency and payload size between:
 *   OLD: full /api/state blob + client-side filtering
 *   NEW: granular /api/v1/factory/* and /api/v1/book/* endpoints
 *
 * Usage:
 *   npx ts-node scripts/benchmark-indexer.ts
 *   npx ts-node scripts/benchmark-indexer.ts --runs 20
 *   npx ts-node scripts/benchmark-indexer.ts --user 0xYourAddress
 */

// ── Config ──────────────────────────────────────────────────────────────────

const OLD_STATE_URL = 'https://dry-cake-8c44.devops-118.workers.dev';
const OLD_INDEXER_URL = 'https://optionbook-indexer.thetanuts.finance/api/v1';

const NEW_BASE_URL = 'https://indexer.thetanuts.finance';
const NEW_INDEXER_URL = 'https://indexer.thetanuts.finance/api/v1/book';

// A known active address on Base — override with --user flag
const DEFAULT_USER = '0xF977814e90dA44bFA03b6295A0616a897441aceC';

// ── Helpers ─────────────────────────────────────────────────────────────────

interface TimedResult {
  label: string;
  durationMs: number;
  payloadBytes: number;
  status: number;
  error?: string;
}

async function timedFetch(label: string, url: string): Promise<TimedResult> {
  const start = performance.now();
  try {
    const res = await fetch(url);
    const body = await res.text();
    const durationMs = performance.now() - start;
    return {
      label,
      durationMs,
      payloadBytes: new TextEncoder().encode(body).byteLength,
      status: res.status,
    };
  } catch (err: unknown) {
    const durationMs = performance.now() - start;
    return {
      label,
      durationMs,
      payloadBytes: 0,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)]!;
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

// ── Benchmark Definitions ───────────────────────────────────────────────────

interface BenchmarkPair {
  name: string;
  description: string;
  old: { label: string; url: string };
  new: { label: string; url: string };
}

function buildBenchmarks(userAddress: string): BenchmarkPair[] {
  return [
    {
      name: 'Health Check',
      description: 'Indexer health/status endpoint',
      old: { label: 'OLD /api/state (full blob)', url: `${OLD_STATE_URL}/api/state` },
      new: { label: 'NEW /health', url: `${NEW_BASE_URL}/health` },
    },
    {
      name: 'All RFQs',
      description: 'Fetch all RFQs — old fetches full state blob, new fetches just RFQs',
      old: { label: 'OLD /api/state (full blob)', url: `${OLD_STATE_URL}/api/state` },
      new: { label: 'NEW /api/v1/factory/rfqs', url: `${NEW_BASE_URL}/api/v1/factory/rfqs` },
    },
    {
      name: 'Single RFQ (id=1)',
      description: 'Fetch one RFQ — old fetches full state then filters, new fetches directly',
      old: { label: 'OLD /api/state (full blob)', url: `${OLD_STATE_URL}/api/state` },
      new: { label: 'NEW /api/v1/factory/rfqs/1', url: `${NEW_BASE_URL}/api/v1/factory/rfqs/1` },
    },
    {
      name: 'All Offers',
      description: 'Fetch all offers',
      old: { label: 'OLD /api/state (full blob)', url: `${OLD_STATE_URL}/api/state` },
      new: { label: 'NEW /api/v1/factory/offers', url: `${NEW_BASE_URL}/api/v1/factory/offers` },
    },
    {
      name: 'All Options',
      description: 'Fetch all options',
      old: { label: 'OLD /api/state (full blob)', url: `${OLD_STATE_URL}/api/state` },
      new: { label: 'NEW /api/v1/factory/options', url: `${NEW_BASE_URL}/api/v1/factory/options` },
    },
    {
      name: 'User RFQs',
      description: `User-scoped RFQ fetch for ${userAddress.slice(0, 10)}...`,
      old: { label: 'OLD /api/state (full blob)', url: `${OLD_STATE_URL}/api/state` },
      new: { label: 'NEW /api/v1/factory/user/.../rfqs', url: `${NEW_BASE_URL}/api/v1/factory/user/${userAddress}/rfqs` },
    },
    {
      name: 'User Offers',
      description: `User-scoped offers fetch`,
      old: { label: 'OLD /api/state (full blob)', url: `${OLD_STATE_URL}/api/state` },
      new: { label: 'NEW /api/v1/factory/user/.../offers', url: `${NEW_BASE_URL}/api/v1/factory/user/${userAddress}/offers` },
    },
    {
      name: 'User Positions (Book)',
      description: 'User positions from the OptionBook indexer',
      old: { label: 'OLD indexer /user/.../positions', url: `${OLD_INDEXER_URL}/user/${userAddress}/positions` },
      new: { label: 'NEW indexer /user/.../positions', url: `${NEW_INDEXER_URL}/user/${userAddress}/positions` },
    },
    {
      name: 'User History (Book)',
      description: 'User trade history from the OptionBook indexer',
      old: { label: 'OLD indexer /user/.../history', url: `${OLD_INDEXER_URL}/user/${userAddress}/history` },
      new: { label: 'NEW indexer /user/.../history', url: `${NEW_INDEXER_URL}/user/${userAddress}/history` },
    },
    {
      name: 'Factory Stats',
      description: 'Protocol statistics — new endpoint (no old equivalent)',
      old: { label: 'OLD /api/state (full blob)', url: `${OLD_STATE_URL}/api/state` },
      new: { label: 'NEW /api/v1/factory/stats', url: `${NEW_BASE_URL}/api/v1/factory/stats` },
    },
  ];
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const runsIdx = args.indexOf('--runs');
  const userIdx = args.indexOf('--user');
  const numRuns = runsIdx !== -1 ? parseInt(args[runsIdx + 1] ?? '5', 10) : 5;
  const userAddress = userIdx !== -1 ? (args[userIdx + 1] ?? DEFAULT_USER) : DEFAULT_USER;

  const benchmarks = buildBenchmarks(userAddress);

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          Thetanuts Indexer Benchmark: Old vs New            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`  Runs per endpoint:  ${numRuns}`);
  console.log(`  User address:       ${userAddress}`);
  console.log(`  Old state URL:      ${OLD_STATE_URL}`);
  console.log(`  Old indexer URL:    ${OLD_INDEXER_URL}`);
  console.log(`  New unified URL:    ${NEW_BASE_URL}`);
  console.log();

  // Warm-up: hit each URL once so DNS/TLS is cached
  console.log('  Warming up connections...');
  await Promise.allSettled([
    fetch(`${OLD_STATE_URL}/api/state`).then((r) => r.text()),
    fetch(`${NEW_BASE_URL}/health`).then((r) => r.text()),
    fetch(`${OLD_INDEXER_URL}/stats`).then((r) => r.text()),
    fetch(`${NEW_INDEXER_URL}/stats`).then((r) => r.text()),
  ]);
  console.log('  Warm-up complete.\n');

  const summaryRows: string[] = [];

  for (const bench of benchmarks) {
    console.log(`─── ${bench.name} ────────────────────────────────────────`);
    console.log(`  ${bench.description}\n`);

    const oldResults: TimedResult[] = [];
    const newResults: TimedResult[] = [];

    for (let i = 0; i < numRuns; i++) {
      // Alternate old/new to avoid systematic bias
      const oldResult = await timedFetch(bench.old.label, bench.old.url);
      const newResult = await timedFetch(bench.new.label, bench.new.url);
      oldResults.push(oldResult);
      newResults.push(newResult);

      // Small gap to be polite to the servers
      await new Promise((r) => setTimeout(r, 100));
    }

    const oldTimes = oldResults.map((r) => r.durationMs);
    const newTimes = newResults.map((r) => r.durationMs);
    const oldPayload = oldResults[0]?.payloadBytes ?? 0;
    const newPayload = newResults[0]?.payloadBytes ?? 0;

    const oldMedian = median(oldTimes);
    const newMedian = median(newTimes);
    const oldP95Val = p95(oldTimes);
    const newP95Val = p95(newTimes);
    const speedup = oldMedian / newMedian;
    const payloadReduction = oldPayload > 0 ? ((1 - newPayload / oldPayload) * 100) : 0;

    const oldErr = oldResults.find((r) => r.error)?.error;
    const newErr = newResults.find((r) => r.error)?.error;

    console.log(`  OLD  ${bench.old.label}`);
    if (oldErr) {
      console.log(`       ERROR: ${oldErr}`);
    } else {
      console.log(`       Median: ${formatMs(oldMedian)}  |  P95: ${formatMs(oldP95Val)}  |  Payload: ${formatBytes(oldPayload)}`);
    }

    console.log(`  NEW  ${bench.new.label}`);
    if (newErr) {
      console.log(`       ERROR: ${newErr}`);
    } else {
      console.log(`       Median: ${formatMs(newMedian)}  |  P95: ${formatMs(newP95Val)}  |  Payload: ${formatBytes(newPayload)}`);
    }

    if (!oldErr && !newErr) {
      const arrow = speedup >= 1 ? '↑' : '↓';
      const color = speedup >= 1 ? '✅' : '⚠️';
      console.log(`  ${color} ${speedup.toFixed(1)}x ${speedup >= 1 ? 'faster' : 'slower'}  |  Payload ${payloadReduction > 0 ? '-' : '+'}${Math.abs(payloadReduction).toFixed(0)}%`);
      summaryRows.push(
        `  ${bench.name.padEnd(25)} ${formatMs(oldMedian).padStart(8)} → ${formatMs(newMedian).padStart(8)}  (${speedup.toFixed(1)}x ${arrow})  payload: ${formatBytes(oldPayload)} → ${formatBytes(newPayload)}`
      );
    } else {
      summaryRows.push(`  ${bench.name.padEnd(25)} ERROR — check connectivity`);
    }

    console.log();
  }

  // ── Summary Table ───────────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                        Summary                             ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  for (const row of summaryRows) {
    console.log(`║${row.padEnd(62)}║`);
  }
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
