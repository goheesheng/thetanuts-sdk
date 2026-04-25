#!/usr/bin/env npx tsx
/**
 * Loan Module Integration Tests
 *
 * Tests read-only methods against live Base mainnet.
 * Run: npx tsx scripts/test-loan-module.ts
 */

import { ethers } from 'ethers';
import { ThetanutsClient } from '../src/client/ThetanutsClient.js';

const BASE_MAINNET_RPC = 'https://mainnet.base.org';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, passed: true });
  console.log(`  [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name: string, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  results.push({ name, passed: false, error: msg });
  console.log(`  [FAIL] ${name}: ${msg}`);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n=== Loan Module Integration Tests ===\n');

  const provider = new ethers.JsonRpcProvider(BASE_MAINNET_RPC);
  const client = new ThetanutsClient({ chainId: 8453, provider });

  // ─── Test 1: fetchPricing ───
  console.log('Pricing:');
  let pricingData;
  try {
    pricingData = await client.loan.fetchPricing();
    const hasETH = pricingData['ETH'] && Object.keys(pricingData['ETH']).length > 0;
    const hasBTC = pricingData['BTC'] && Object.keys(pricingData['BTC']).length > 0;
    if (hasETH && hasBTC) {
      pass('fetchPricing()', `ETH: ${Object.keys(pricingData['ETH']).length} options, BTC: ${Object.keys(pricingData['BTC']).length} options`);
    } else {
      fail('fetchPricing()', new Error(`Missing data: ETH=${hasETH}, BTC=${hasBTC}`));
    }
  } catch (e) {
    fail('fetchPricing()', e);
  }

  await delay(500);

  // ─── Test 2: fetchPricing cache ───
  try {
    const start = Date.now();
    await client.loan.fetchPricing();
    const elapsed = Date.now() - start;
    if (elapsed < 100) {
      pass('fetchPricing() cache', `returned in ${elapsed}ms (cached)`);
    } else {
      fail('fetchPricing() cache', new Error(`took ${elapsed}ms, expected <100ms for cached`));
    }
  } catch (e) {
    fail('fetchPricing() cache', e);
  }

  // ─── Test 3: getStrikeOptions ETH ───
  console.log('\nStrike Options:');
  try {
    const groups = await client.loan.getStrikeOptions('ETH');
    if (groups.length > 0) {
      const totalOptions = groups.reduce((sum, g) => sum + g.options.length, 0);
      const firstGroup = groups[0];
      const firstOpt = firstGroup.options[0];
      pass('getStrikeOptions("ETH")', `${groups.length} expiry groups, ${totalOptions} total options`);

      // Validate structure
      if (firstOpt.strike > 0 && firstOpt.expiry > 0 && firstOpt.underlyingPrice > 0 && firstOpt.askPrice >= 0) {
        pass('Strike option structure', `strike=$${firstOpt.strike}, expiry=${firstGroup.expiryFormatted}, price=$${firstOpt.underlyingPrice}`);
      } else {
        fail('Strike option structure', new Error('Missing required fields'));
      }
    } else {
      fail('getStrikeOptions("ETH")', new Error('No strike groups returned'));
    }
  } catch (e) {
    fail('getStrikeOptions("ETH")', e);
  }

  await delay(500);

  // ─── Test 4: getStrikeOptions BTC ───
  try {
    const groups = await client.loan.getStrikeOptions('BTC');
    if (groups.length > 0) {
      const totalOptions = groups.reduce((sum, g) => sum + g.options.length, 0);
      pass('getStrikeOptions("BTC")', `${groups.length} expiry groups, ${totalOptions} total options`);
    } else {
      fail('getStrikeOptions("BTC")', new Error('No strike groups returned'));
    }
  } catch (e) {
    fail('getStrikeOptions("BTC")', e);
  }

  // ─── Test 5: getStrikeOptions with filters ───
  try {
    const groups = await client.loan.getStrikeOptions('ETH', {
      minDurationDays: 30,
      maxStrikes: 3,
      sortOrder: 'highestStrike',
      maxApr: 15,
    });
    const maxPerGroup = Math.max(...groups.map(g => g.options.length));
    if (maxPerGroup <= 3) {
      pass('getStrikeOptions() maxStrikes filter', `max ${maxPerGroup} per group (limit=3)`);
    } else {
      fail('getStrikeOptions() maxStrikes filter', new Error(`${maxPerGroup} options in a group, expected <=3`));
    }
  } catch (e) {
    fail('getStrikeOptions() maxStrikes filter', e);
  }

  // ─── Test 6: calculateLoan ───
  console.log('\nCalculation:');
  try {
    // Use real pricing data
    const groups = await client.loan.getStrikeOptions('ETH');
    if (groups.length > 0 && groups[0].options.length > 0) {
      const opt = groups[0].options[0];
      const calc = client.loan.calculateLoan({
        depositAmount: '1.0',
        underlying: 'ETH',
        strike: opt.strike,
        expiryTimestamp: opt.expiry,
        askPrice: opt.askPrice,
        underlyingPrice: opt.underlyingPrice,
      });

      if (calc) {
        // Validate all fields
        const checks = [
          calc.owe > 0n,
          calc.finalLoanAmount > 0n,
          calc.totalCosts > 0n,
          calc.protocolFee > 0n,
          calc.capitalCost > 0n,
          calc.effectiveApr > 0,
          calc.formatted.receive.length > 0,
          calc.formatted.repay.length > 0,
          calc.formatted.apr.length > 0,
        ];

        if (checks.every(Boolean)) {
          pass('calculateLoan()', `receive=${calc.formatted.receive} USDC, repay=${calc.formatted.repay} USDC, APR=${calc.formatted.apr}%`);
        } else {
          fail('calculateLoan()', new Error(`Some fields invalid: owe=${calc.owe}, final=${calc.finalLoanAmount}`));
        }

        // Verify math: owe = finalLoanAmount + totalCosts
        if (calc.owe === calc.finalLoanAmount + calc.totalCosts) {
          pass('calculateLoan() math check', 'owe === finalLoanAmount + totalCosts');
        } else {
          fail('calculateLoan() math check', new Error(`${calc.owe} !== ${calc.finalLoanAmount} + ${calc.totalCosts}`));
        }

        // Verify totalCosts = optionCost + capitalCost + protocolFee
        if (calc.totalCosts === calc.optionCost + calc.capitalCost + calc.protocolFee) {
          pass('calculateLoan() cost breakdown', 'totalCosts === optionCost + capitalCost + protocolFee');
        } else {
          fail('calculateLoan() cost breakdown', new Error('Cost components do not sum to totalCosts'));
        }
      } else {
        fail('calculateLoan()', new Error('Returned null'));
      }
    } else {
      fail('calculateLoan()', new Error('No strike data available'));
    }
  } catch (e) {
    fail('calculateLoan()', e);
  }

  // ─── Test 7: calculateLoan edge cases ───
  try {
    const nullResult = client.loan.calculateLoan({
      depositAmount: '0',
      underlying: 'ETH',
      strike: 1600,
      expiryTimestamp: Math.floor(Date.now() / 1000) + 86400,
      askPrice: 0.007,
      underlyingPrice: 2500,
    });
    if (nullResult === null) {
      pass('calculateLoan() zero deposit', 'returns null as expected');
    } else {
      fail('calculateLoan() zero deposit', new Error('Should return null for zero deposit'));
    }
  } catch (e) {
    fail('calculateLoan() zero deposit', e);
  }

  // ─── Test 8: isPromoOption ───
  console.log('\nPromo:');
  try {
    const now = Math.floor(Date.now() / 1000);

    // Should be promo: >90 days, <50% LTV
    const promo = client.loan.isPromoOption(1000, 2500, now + 100 * 86400);
    // Should NOT be promo: <90 days
    const notPromoShort = client.loan.isPromoOption(1000, 2500, now + 30 * 86400);
    // Should NOT be promo: >50% LTV
    const notPromoLtv = client.loan.isPromoOption(1500, 2500, now + 100 * 86400);

    if (promo && !notPromoShort && !notPromoLtv) {
      pass('isPromoOption()', 'correct for all cases');
    } else {
      fail('isPromoOption()', new Error(`promo=${promo}, shortDuration=${notPromoShort}, highLTV=${notPromoLtv}`));
    }
  } catch (e) {
    fail('isPromoOption()', e);
  }

  // ─── Test 9: getLendingOpportunities ───
  console.log('\nIndexer:');
  try {
    const opps = await client.loan.getLendingOpportunities();
    pass('getLendingOpportunities()', `${opps.length} opportunities found`);

    if (opps.length > 0) {
      const first = opps[0];
      const hasFields = first.quotationId && first.requester && first.underlying &&
        first.lendAmountFormatted && first.strike > 0 && first.expiryTimestamp > 0;
      if (hasFields) {
        pass('Lending opportunity structure', `#${first.quotationId} ${first.underlying} $${first.strike} APR=${first.aprFormatted}%`);
      } else {
        fail('Lending opportunity structure', new Error('Missing required fields'));
      }
    }
  } catch (e) {
    fail('getLendingOpportunities()', e);
  }

  await delay(500);

  // ─── Test 10: getLendingOpportunities with filter ───
  try {
    const ethOpps = await client.loan.getLendingOpportunities({ underlying: 'ETH' });
    const allEth = ethOpps.every(o => o.underlying === 'ETH');
    if (allEth) {
      pass('getLendingOpportunities({ underlying: "ETH" })', `${ethOpps.length} ETH opportunities`);
    } else {
      fail('getLendingOpportunities() filter', new Error('Non-ETH results returned'));
    }
  } catch (e) {
    fail('getLendingOpportunities() filter', e);
  }

  // ─── Test 11: getUserLoans ───
  try {
    const loans = await client.loan.getUserLoans('0xF977814e90dA44bFA03b6295A0616a897441aceC');
    pass('getUserLoans()', `${loans.length} loans found`);
  } catch (e) {
    fail('getUserLoans()', e);
  }

  // ─── Test 12: Encode methods ───
  console.log('\nEncoding:');
  try {
    const encoded = client.loan.encodeRequestLoan({
      underlying: 'ETH',
      collateralAmount: '1.0',
      strike: 1600,
      expiryTimestamp: Math.floor(Date.now() / 1000) + 86400 * 30,
      minSettlementAmount: 1400000000n,
    });
    if (encoded.to && encoded.data && encoded.data.startsWith('0x')) {
      pass('encodeRequestLoan()', `to=${encoded.to.slice(0, 10)}..., data=${encoded.data.slice(0, 10)}... (${encoded.data.length} chars)`);
    } else {
      fail('encodeRequestLoan()', new Error('Invalid encoded output'));
    }
  } catch (e) {
    fail('encodeRequestLoan()', e);
  }

  try {
    const encoded = client.loan.encodeAcceptOffer(1n, 1400000000n, 12345n, '0xf1711ba7e74435032aa103ef20a4cbece40b6df5');
    if (encoded.to && encoded.data.startsWith('0x')) {
      pass('encodeAcceptOffer()', 'valid encoded output');
    } else {
      fail('encodeAcceptOffer()', new Error('Invalid'));
    }
  } catch (e) {
    fail('encodeAcceptOffer()', e);
  }

  try {
    const encoded = client.loan.encodeCancelLoan(1n);
    if (encoded.to && encoded.data.startsWith('0x')) {
      pass('encodeCancelLoan()', 'valid encoded output');
    } else {
      fail('encodeCancelLoan()', new Error('Invalid'));
    }
  } catch (e) {
    fail('encodeCancelLoan()', e);
  }

  // ─── Summary ───
  console.log('\n=== Results ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n  ${passed} passed, ${failed} failed, ${results.length} total\n`);

  if (failed > 0) {
    console.log('Failures:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  - ${r.name}: ${r.error}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
