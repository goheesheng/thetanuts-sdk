// Workflow: Both — Query protocol stats and daily trading data for OptionBook and RFQ (Factory)
//
// The SDK provides separate stats endpoints for OptionBook and Factory (RFQ),
// plus combined endpoints that merge both.

import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

// Example 1: OptionBook Protocol Stats
// Includes 24h/7d/30d time windows, per-token volumes, exercise rate
const bookStats = await client.api.getBookProtocolStats();
console.log('Book positions:', bookStats.stats.totalPositions);
console.log('Book 24h volume:', bookStats.stats['24h']?.volumeUsd);

// Example 2: Factory (RFQ) Protocol Stats
// Includes avgTimeToFill and avgOffersPerRfq
const factoryStats = await client.api.getFactoryProtocolStats();
console.log('Factory positions:', factoryStats.stats.totalPositions);
console.log('Avg fill time:', factoryStats.stats.avgTimeToFill, 'seconds');

// Example 3: Combined Protocol Stats
const combined = await client.api.getProtocolStats();
console.log('Total positions:', combined.stats.totalPositions);
console.log('Total volume:', combined.stats.totalVolumeUsd, 'USD');

// Example 4: OptionBook Daily Time Series
const bookDaily = await client.api.getBookDailyStats();
for (const day of bookDaily.daily) {
  console.log(`${day.date}: ${day.trades} trades, $${day.volumeUsd} volume`);
}

// Example 5: Factory Daily Time Series
const factoryDaily = await client.api.getFactoryDailyStats();
console.log('Factory daily entries:', factoryDaily.daily.length);

// Example 6: Combined Daily Time Series
const allDaily = await client.api.getDailyStats();
console.log('Total daily entries:', allDaily.daily.length);

// Example 7: Referrer Stats (OptionBook only)
const referrer = await client.api.getReferrerStatsFromIndexer('0x...');
console.log('Referred positions:', Object.keys(referrer.positions ?? {}).length);
if (referrer.summary) {
  console.log('Total volume:', referrer.summary.totalVolumeUsd, 'USD');
  console.log('Total fees:', referrer.summary.totalFeesUsd, 'USD');
}

// Example 8: Single Option Detail
// Factory option (from RFQ)
const factoryOpt = await client.api.getFactoryOption('0x...');
// Book option (from OptionBook)
const bookOpt = await client.api.getBookOption('0x...');
