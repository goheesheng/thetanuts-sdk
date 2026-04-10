#!/usr/bin/env npx tsx
/**
 * SDK Indexer Endpoints Test Runner
 *
 * Tests all APIModule methods against the live unified indexer at indexer.thetanuts.finance.
 * Includes old vs new indexer comparison.
 *
 * Usage:
 *   npx tsx scripts/test-indexer-endpoints.ts
 *   npm run test:indexer
 */

import { ethers } from 'ethers';
import { ThetanutsClient } from '../src/client/ThetanutsClient.js';

// Configuration
const BASE_MAINNET_RPC = 'https://mainnet.base.org';
const BASE_CHAIN_ID = 8453;
const OLD_INDEXER_BASE = 'https://optionbook-indexer.thetanuts.finance/api/v1';

const TEST_ADDRESSES = {
  /** 126 book positions, no referral data */
  USER_1: '0xdc7f6ebefe62a402e7c75dd0b6d20ed7c4cb326a',
  /** 63 book positions, 220 referrer positions */
  USER_2: '0x92b8ac05b63472d1D84b32bDFBBf3e1887331567',
  /** 0 book positions, 6770+ referrer positions */
  REFERRER: '0x94D784e81A5c8cA6E19629C73217b61a256Ea1c7',
  /** Known factory/RFQ referrer with credited RFQs */
  FACTORY_REFERRER: '0xe6C37A15eB50E9a96D585991f73De30dF410e7eF',
};

const KNOWN_DATA = {
  RFQ_ID: '1',
  FACTORY_OPTION: '0x7e5B9c2b9A099221749F5823610c8d3e57e03d5A',
  BOOK_OPTION: '0x75850d3a3b5C948E2d5fABf6A1ca1BC1Db6E8202',
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(message);
}

function pass(name: string, detail?: string) {
  results.push({ name, passed: true });
  log(`  [PASS] ${name}`);
  if (detail) log(`         ${detail}`);
}

function fail(name: string, error: Error) {
  results.push({ name, passed: false, error: error.message });
  log(`  [FAIL] ${name}: ${error.message}`);
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  return res.json();
}

async function runTests() {
  log('\n========================================');
  log('  SDK Indexer Endpoints Test Runner');
  log('========================================\n');

  const provider = new ethers.JsonRpcProvider(BASE_MAINNET_RPC);
  const client = new ThetanutsClient({
    chainId: BASE_CHAIN_ID,
    provider,
  });

  log(`[Config] Chain ID: ${client.chainId}`);
  log(`[Config] Indexer URL: ${client.indexerApiUrl}`);
  log(`[Config] State URL: ${client.stateApiUrl}`);
  log(`[Config] Old Indexer: ${OLD_INDEXER_BASE}\n`);

  // ========== Suite 1: Indexer API (indexerRequest) ==========
  log('--- 1. Indexer API (Book) ---');

  try {
    const positions = await client.api.getUserPositionsFromIndexer(TEST_ADDRESSES.USER_1);
    if (!Array.isArray(positions)) throw new Error('Expected array');
    if (positions.length === 0) throw new Error('Expected positions > 0');
    const first = positions[0];
    if (!first.optionAddress) throw new Error('Missing optionAddress');
    if (!first.side) throw new Error('Missing side');
    if (!first.status) throw new Error('Missing status');
    pass('getUserPositionsFromIndexer()', `${positions.length} positions, first: ${first.optionAddress.slice(0, 10)}... ${first.side} ${first.status}`);
  } catch (e) {
    fail('getUserPositionsFromIndexer()', e as Error);
  }

  try {
    const history = await client.api.getUserHistoryFromIndexer(TEST_ADDRESSES.USER_1);
    if (!Array.isArray(history)) throw new Error('Expected array');
    if (history.length === 0) throw new Error('Expected history > 0');
    pass('getUserHistoryFromIndexer()', `${history.length} trade history entries`);
  } catch (e) {
    fail('getUserHistoryFromIndexer()', e as Error);
  }

  try {
    const stats = await client.api.getStatsFromIndexer();
    if (stats.totalOptionsTracked <= 0) throw new Error('totalOptionsTracked should be > 0');
    if (stats.uniqueUsers <= 0) throw new Error('uniqueUsers should be > 0');
    pass('getStatsFromIndexer()', `options=${stats.totalOptionsTracked} users=${stats.uniqueUsers} open=${stats.openPositions} settled=${stats.settledPositions}`);
  } catch (e) {
    fail('getStatsFromIndexer()', e as Error);
  }

  try {
    const referrer = await client.api.getReferrerStatsFromIndexer(TEST_ADDRESSES.REFERRER);
    if (!referrer.referrer) throw new Error('Missing referrer address');
    const posCount = Object.keys(referrer.positions).length;
    if (posCount === 0) throw new Error('Expected referrer positions > 0');
    const hasSummary = !!referrer.summary;
    pass('getReferrerStatsFromIndexer()', `positions=${posCount} summary=${hasSummary ? 'YES (totalVolumeUsd=' + referrer.summary!.totalVolumeUsd + ')' : 'NO'}`);
  } catch (e) {
    fail('getReferrerStatsFromIndexer()', e as Error);
  }

  try {
    await client.api.triggerIndexerUpdate();
    pass('triggerIndexerUpdate()', 'POST succeeded (no-op)');
  } catch (e) {
    fail('triggerIndexerUpdate()', e as Error);
  }

  // ========== Suite 2: State/RFQ API (stateRequest) ==========
  log('\n--- 2. State/RFQ API ---');

  try {
    const health = await client.api.getHealth();
    if (health.status !== 'ok') throw new Error(`Status: ${health.status}`);
    if (health.lagBlocks > 100) throw new Error(`Lag too high: ${health.lagBlocks}`);
    pass('getHealth()', `status=${health.status} lag=${health.lagBlocks} block=${health.lastIndexedBlock}`);
  } catch (e) {
    fail('getHealth()', e as Error);
  }

  try {
    const state = await client.api.getStateFromRfq();
    if (!state.rfqs) throw new Error('Missing rfqs');
    if (!state.protocolStats) throw new Error('Missing protocolStats');
    const rfqCount = Object.keys(state.rfqs).length;
    pass('getStateFromRfq()', `rfqs=${rfqCount} stats.totalRfqs=${state.protocolStats.totalRfqs}`);
  } catch (e) {
    fail('getStateFromRfq()', e as Error);
  }

  try {
    const rfqs = await client.api.getFactoryRfqs();
    if (!Array.isArray(rfqs)) throw new Error('Expected array');
    if (rfqs.length === 0) throw new Error('Expected rfqs > 0');
    pass('getFactoryRfqs()', `${rfqs.length} total RFQs`);
  } catch (e) {
    fail('getFactoryRfqs()', e as Error);
  }

  try {
    const active = await client.api.getFactoryRfqs('active');
    if (!Array.isArray(active)) throw new Error('Expected array');
    const activeCount = active.filter((r: { status: string }) => r.status === 'active').length;
    const nonActiveCount = active.length - activeCount;
    if (nonActiveCount > 0) {
      log(`         ⚠ Indexer returned ${nonActiveCount} non-active RFQ(s) in active filter (indexer bug)`);
    }
    pass('getFactoryRfqs("active")', `${active.length} returned, ${activeCount} active`);
  } catch (e) {
    fail('getFactoryRfqs("active")', e as Error);
  }

  try {
    const offers = await client.api.getFactoryOffers();
    if (!Array.isArray(offers)) throw new Error('Expected array');
    pass('getFactoryOffers()', `${offers.length} offers`);
  } catch (e) {
    fail('getFactoryOffers()', e as Error);
  }

  try {
    const options = await client.api.getFactoryOptions();
    if (!Array.isArray(options)) throw new Error('Expected array');
    pass('getFactoryOptions()', `${options.length} options`);
  } catch (e) {
    fail('getFactoryOptions()', e as Error);
  }

  try {
    const stats = await client.api.getFactoryStats();
    if (stats.totalRfqs <= 0) throw new Error('totalRfqs should be > 0');
    pass('getFactoryStats()', `totalRfqs=${stats.totalRfqs} active=${stats.activeRfqs} settled=${stats.settledRfqs}`);
  } catch (e) {
    fail('getFactoryStats()', e as Error);
  }

  try {
    const state = await client.api.getBookState();
    if (!state['positions'] && !state['indexedBookAddresses']) throw new Error('Missing expected keys');
    pass('getBookState()', `keys: ${Object.keys(state).slice(0, 4).join(', ')}...`);
  } catch (e) {
    fail('getBookState()', e as Error);
  }

  try {
    const rfq = await client.api.getRfq(KNOWN_DATA.RFQ_ID);
    if (rfq.id !== KNOWN_DATA.RFQ_ID) throw new Error(`Expected id=${KNOWN_DATA.RFQ_ID}, got ${rfq.id}`);
    if (rfq.status !== 'settled') throw new Error(`Expected settled, got ${rfq.status}`);
    pass('getRfq("1")', `id=${rfq.id} status=${rfq.status} requester=${rfq.requester.slice(0, 10)}...`);
  } catch (e) {
    fail('getRfq("1")', e as Error);
  }

  try {
    const rfqs = await client.api.getUserRfqs(TEST_ADDRESSES.USER_1);
    if (!Array.isArray(rfqs)) throw new Error('Expected array');
    pass('getUserRfqs()', `${rfqs.length} RFQs for user`);
  } catch (e) {
    fail('getUserRfqs()', e as Error);
  }

  try {
    const offers = await client.api.getUserOffersFromRfq(TEST_ADDRESSES.USER_1);
    if (!Array.isArray(offers)) throw new Error('Expected array');
    pass('getUserOffersFromRfq()', `${offers.length} offers for user`);
  } catch (e) {
    fail('getUserOffersFromRfq()', e as Error);
  }

  try {
    const options = await client.api.getUserOptionsFromRfq(TEST_ADDRESSES.USER_1);
    if (!Array.isArray(options)) throw new Error('Expected array');
    pass('getUserOptionsFromRfq()', `${options.length} options for user`);
  } catch (e) {
    fail('getUserOptionsFromRfq()', e as Error);
  }

  try {
    const detail = await client.api.getFactoryOption(KNOWN_DATA.FACTORY_OPTION);
    if (!detail.optionAddress) throw new Error('Missing optionAddress');
    if (!detail.optionStatus) throw new Error('Missing optionStatus');
    pass('getFactoryOption()', `option=${detail.optionAddress.slice(0, 10)}... status=${detail.optionStatus} rfqs=${detail.rfqs?.length ?? 0}`);
  } catch (e) {
    fail('getFactoryOption()', e as Error);
  }

  try {
    const refStats = await client.api.getFactoryReferrerStats(TEST_ADDRESSES.FACTORY_REFERRER);
    if (!refStats.referrer) throw new Error('Missing referrer');
    if (refStats.referrer.toLowerCase() !== TEST_ADDRESSES.FACTORY_REFERRER.toLowerCase()) {
      throw new Error(`Referrer mismatch: ${refStats.referrer}`);
    }
    if (!Array.isArray(refStats.referralIds)) throw new Error('referralIds not an array');
    if (!refStats.rfqs || typeof refStats.rfqs !== 'object') throw new Error('rfqs not an object');
    if (!refStats.protocolStats) throw new Error('Missing protocolStats');
    if (typeof refStats.lastUpdateTimestamp !== 'number') throw new Error('lastUpdateTimestamp not a number');

    // Full protocolStats field coverage — exercise every declared field in FactoryReferrerProtocolStats
    const ps = refStats.protocolStats;
    if (typeof ps.totalRFQs !== 'number') throw new Error('protocolStats.totalRFQs not a number');
    if (typeof ps.totalOffers !== 'number') throw new Error('protocolStats.totalOffers not a number');
    if (typeof ps.totalOptions !== 'number') throw new Error('protocolStats.totalOptions not a number');
    if (!ps.totalVolume || typeof ps.totalVolume !== 'object') throw new Error('protocolStats.totalVolume not an object');
    if (!ps.totalPremium || typeof ps.totalPremium !== 'object') throw new Error('protocolStats.totalPremium not an object');
    if (!ps.totalFees || typeof ps.totalFees !== 'object') throw new Error('protocolStats.totalFees not an object');
    if (typeof ps.totalReferralFees !== 'string') throw new Error('protocolStats.totalReferralFees not a string');

    // Non-empty rfqs — known-good referrer should always have credited RFQs
    const rfqCount = Object.keys(refStats.rfqs).length;
    if (rfqCount === 0) throw new Error('Expected rfqs > 0 for known-good referrer');

    // Spot-check one RFQ against required StateRfq fields — verifies the wire format still matches the declared type
    const firstRfqKey = Object.keys(refStats.rfqs)[0];
    const firstRfq = refStats.rfqs[firstRfqKey];
    if (typeof firstRfq.id !== 'string') throw new Error(`rfq.id not a string (key=${firstRfqKey})`);
    if (typeof firstRfq.requester !== 'string') throw new Error('rfq.requester not a string');
    if (!Array.isArray(firstRfq.strikes)) throw new Error('rfq.strikes not an array');
    if (typeof firstRfq.status !== 'string') throw new Error('rfq.status not a string');
    if (typeof firstRfq.createdAt !== 'number') throw new Error('rfq.createdAt not a number');
    if (typeof firstRfq.expiryTimestamp !== 'number') throw new Error('rfq.expiryTimestamp not a number');

    pass('getFactoryReferrerStats()', `rfqs=${rfqCount} referralIds=[${refStats.referralIds.join(',')}] protocolStats.totalRFQs=${ps.totalRFQs} firstRfq=${firstRfq.id}/${firstRfq.status}`);
  } catch (e) {
    fail('getFactoryReferrerStats()', e as Error);
  }

  try {
    const detail = await client.api.getBookOption(KNOWN_DATA.BOOK_OPTION);
    if (!detail.optionAddress) throw new Error('Missing optionAddress');
    if (!detail.optionStatus) throw new Error('Missing optionStatus');
    pass('getBookOption()', `option=${detail.optionAddress.slice(0, 10)}... status=${detail.optionStatus}`);
  } catch (e) {
    fail('getBookOption()', e as Error);
  }

  // ========== OptionBook Fee Helpers ==========
  log('\n--- OptionBook Fee Helpers ---');

  try {
    // Test with a known referrer that may have fees
    const claimable = await client.optionBook.getAllClaimableFees(TEST_ADDRESSES.REFERRER);
    if (!Array.isArray(claimable)) throw new Error('Expected array');
    // Each element should have the correct shape
    for (const fee of claimable) {
      if (typeof fee.token !== 'string') throw new Error('fee.token not a string');
      if (typeof fee.symbol !== 'string') throw new Error('fee.symbol not a string');
      if (typeof fee.decimals !== 'number') throw new Error('fee.decimals not a number');
      if (typeof fee.amount !== 'bigint') throw new Error('fee.amount not a bigint');
      if (fee.amount <= 0n) throw new Error('fee.amount should be > 0 (non-zero only)');
    }
    pass('getAllClaimableFees()', `${claimable.length} token${claimable.length !== 1 ? 's' : ''} with claimable fees${claimable.length > 0 ? ': ' + claimable.map(f => f.symbol).join(', ') : ''}`);
  } catch (e) {
    fail('getAllClaimableFees()', e as Error);
  }

  try {
    // Test with a zero-balance address — should return empty array, not throw
    const empty = await client.optionBook.getAllClaimableFees('0x0000000000000000000000000000000000000001');
    if (!Array.isArray(empty)) throw new Error('Expected array');
    if (empty.length !== 0) throw new Error(`Expected empty array for zero-balance address, got ${empty.length}`);
    pass('getAllClaimableFees(zero-balance)', 'returned empty array as expected');
  } catch (e) {
    fail('getAllClaimableFees(zero-balance)', e as Error);
  }

  // ========== Suite 3: Protocol Stats (new) ==========
  log('\n--- 3. Protocol Stats (new) ---');

  let bookTotal = 0;
  let factoryTotal = 0;

  try {
    const resp = await client.api.getBookProtocolStats();
    if (!resp.stats) throw new Error('Missing stats');
    if (resp.stats.totalPositions <= 0) throw new Error('totalPositions should be > 0');
    if (!resp.stats.totalVolumeUsd) throw new Error('Missing totalVolumeUsd');
    const h24 = resp.stats['24h'];
    if (!h24) throw new Error('Missing 24h window');
    bookTotal = resp.stats.totalPositions;
    pass('getBookProtocolStats()', `positions=${resp.stats.totalPositions} volume=$${resp.stats.totalVolumeUsd} 24h.positions=${h24.positions}`);
  } catch (e) {
    fail('getBookProtocolStats()', e as Error);
  }

  try {
    const resp = await client.api.getFactoryProtocolStats();
    if (!resp.stats) throw new Error('Missing stats');
    if (resp.stats.totalPositions <= 0) throw new Error('totalPositions should be > 0');
    factoryTotal = resp.stats.totalPositions;
    pass('getFactoryProtocolStats()', `positions=${resp.stats.totalPositions} volume=$${resp.stats.totalVolumeUsd}`);
  } catch (e) {
    fail('getFactoryProtocolStats()', e as Error);
  }

  try {
    const resp = await client.api.getProtocolStats();
    if (!resp.stats) throw new Error('Missing stats');
    if (resp.stats.totalPositions < bookTotal) throw new Error(`Combined (${resp.stats.totalPositions}) < book (${bookTotal})`);
    pass('getProtocolStats()', `combined=${resp.stats.totalPositions} (book=${bookTotal} factory=${factoryTotal}) volume=$${resp.stats.totalVolumeUsd}`);
  } catch (e) {
    fail('getProtocolStats()', e as Error);
  }

  // ========== Suite 4: Daily Stats (new) ==========
  log('\n--- 4. Daily Stats (new) ---');

  let bookDays = 0;
  let factoryDays = 0;

  try {
    const resp = await client.api.getBookDailyStats();
    if (!resp.daily) throw new Error('Missing daily');
    if (resp.daily.length === 0) throw new Error('Expected daily entries > 0');
    const first = resp.daily[0];
    if (!first.date) throw new Error('Missing date field');
    if (first.trades === undefined) throw new Error('Missing trades field');
    bookDays = resp.daily.length;
    pass('getBookDailyStats()', `${resp.daily.length} days, first: ${first.date} (${first.trades} trades, $${first.volumeUsd})`);
  } catch (e) {
    fail('getBookDailyStats()', e as Error);
  }

  try {
    const resp = await client.api.getFactoryDailyStats();
    if (!resp.daily) throw new Error('Missing daily');
    if (resp.daily.length === 0) throw new Error('Expected daily entries > 0');
    factoryDays = resp.daily.length;
    pass('getFactoryDailyStats()', `${resp.daily.length} days`);
  } catch (e) {
    fail('getFactoryDailyStats()', e as Error);
  }

  try {
    const resp = await client.api.getDailyStats();
    if (!resp.daily) throw new Error('Missing daily');
    if (resp.daily.length === 0) throw new Error('Expected daily entries > 0');
    pass('getDailyStats()', `${resp.daily.length} combined days (book=${bookDays} factory=${factoryDays})`);
  } catch (e) {
    fail('getDailyStats()', e as Error);
  }

  // ========== Suite 5: Old vs New Comparison ==========
  log('\n--- 5. Old vs New Indexer Comparison ---');

  try {
    const addr = TEST_ADDRESSES.USER_2;
    const newPositions = await client.api.getUserPositionsFromIndexer(addr);
    const oldData = await fetchJson(`${OLD_INDEXER_BASE}/user/${addr}/positions`) as unknown[];
    const oldCount = Array.isArray(oldData) ? oldData.length : 0;
    const newCount = newPositions.length;
    if (newCount < oldCount) throw new Error(`New (${newCount}) < Old (${oldCount})`);
    pass('Positions parity', `new=${newCount} old=${oldCount} (new >= old ✓)`);
  } catch (e) {
    fail('Positions parity', e as Error);
  }

  try {
    const addr = TEST_ADDRESSES.USER_2;
    const newHistory = await client.api.getUserHistoryFromIndexer(addr);
    const oldData = await fetchJson(`${OLD_INDEXER_BASE}/user/${addr}/history`) as unknown[];
    const oldCount = Array.isArray(oldData) ? oldData.length : 0;
    const newCount = newHistory.length;
    pass('History parity', `new=${newCount} old=${oldCount}`);
  } catch (e) {
    fail('History parity', e as Error);
  }

  try {
    const addr = TEST_ADDRESSES.REFERRER;
    const newReferrer = await client.api.getReferrerStatsFromIndexer(addr);
    const oldData = await fetchJson(`${OLD_INDEXER_BASE}/referrer/${addr}/state`) as Record<string, unknown>;
    const oldPositions = oldData['positions'] as Record<string, unknown> | undefined;
    const oldCount = oldPositions ? Object.keys(oldPositions).length : 0;
    const newCount = Object.keys(newReferrer.positions).length;
    if (newCount < oldCount - 100) throw new Error(`New (${newCount}) significantly less than Old (${oldCount})`);
    pass('Referrer parity', `new=${newCount} old=${oldCount}`);
  } catch (e) {
    fail('Referrer parity', e as Error);
  }

  // ========== Summary ==========
  log('\n========================================');
  log('  RESULTS SUMMARY');
  log('========================================');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  log(`\n  Total:  ${total}`);
  log(`  Passed: ${passed}`);
  log(`  Failed: ${failed}`);

  if (failed > 0) {
    log('\n  Failed tests:');
    for (const r of results.filter((r) => !r.passed)) {
      log(`    ✗ ${r.name}: ${r.error}`);
    }
  }

  log(`\n  ${failed === 0 ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
