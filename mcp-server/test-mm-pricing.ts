import { ThetanutsClient } from './src/client/ThetanutsClient.js';
import { ethers } from 'ethers';

async function test() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const client = new ThetanutsClient({ chainId: 8453, provider });

  console.log('Testing getPositionPricing with numContracts=6 (raw count)');
  
  const pricing = await client.mmPricing.getPositionPricing({
    ticker: 'ETH-13MAR26-1800-P',
    isLong: false,
    numContracts: 6,
    collateralToken: 'USDC',
  });
  
  console.log('Results:');
  console.log('  numContracts:', pricing.numContracts);
  console.log('  collateralRequired:', pricing.collateralRequired.toString());
  console.log('  collateralCost:', pricing.collateralCost.toString());
  console.log('  basePremium:', pricing.basePremium.toString());
  console.log('  totalPrice:', pricing.totalPrice.toString());
  console.log('');
  console.log('Human readable (USDC):');
  console.log('  collateralRequired:', Number(pricing.collateralRequired) / 1e6, 'USDC');
  console.log('  collateralCost:', Number(pricing.collateralCost) / 1e6, 'USDC');
  console.log('  basePremium:', Number(pricing.basePremium) / 1e6, 'USDC');
  console.log('  totalPrice:', Number(pricing.totalPrice) / 1e6, 'USDC');
}

test().catch(console.error);
