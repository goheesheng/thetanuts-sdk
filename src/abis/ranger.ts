/**
 * RangerOption ABI — Thetanuts V4 Ranger (zone-bound) implementation.
 * Source: thetaverse/abis/RangerOption.json (Base_r12).
 *
 * User-facing surface only. Admin/internal callbacks are deliberately
 * omitted: notifyCreationComplete, notifyTradeSettled,
 * executeCollateralReclaim, approveTransfer, rescueERC20.
 */
export const RANGER_OPTION_ABI = [
  // ============ Constants ============
  {
    type: 'function',
    name: 'PRICE_DECIMALS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },

  // ============ Identity / metadata ============
  {
    type: 'function',
    name: 'buyer',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'seller',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'creator',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'collateralToken',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'collateralAmount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'numContracts',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'expiryTimestamp',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'chainlinkPriceFeed',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'historicalTWAPConsumer',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'twapPeriod',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'optionType',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'optionSettled',
    inputs: [],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'paramsHash',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'splitGeneration',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'optionParent',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'optionChildren',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'factory',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'rescueAddress',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getImplementation',
    inputs: [],
    outputs: [{ name: 'implementation', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStrikes',
    inputs: [],
    outputs: [{ name: 'strikes', type: 'uint256[]', internalType: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'buyerAllowance',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'sellerAllowance',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },

  // ============ Ranger-specific views ============
  {
    type: 'function',
    name: 'getZone',
    inputs: [],
    outputs: [
      { name: 'zoneLower', type: 'uint256', internalType: 'uint256' },
      { name: 'zoneUpper', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSpreadWidth',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },

  // ============ Pricing / payout views ============
  {
    type: 'function',
    name: 'getTWAP',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculatePayout',
    inputs: [{ name: 'price', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculateRequiredCollateral',
    inputs: [
      { name: '_strikes', type: 'uint256[]', internalType: 'uint256[]' },
      { name: '_numContracts', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'calculateNumContractsForCollateral',
    inputs: [
      { name: '_strikes', type: 'uint256[]', internalType: 'uint256[]' },
      { name: '_collateralAmount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'simulatePayout',
    inputs: [
      { name: 'price', type: 'uint256', internalType: 'uint256' },
      { name: '_strikes', type: 'uint256[]', internalType: 'uint256[]' },
      { name: '_numContracts', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    name: 'getReclaimFee',
    inputs: [{ name: 'caller', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSplitFee',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'validateParams',
    inputs: [{ name: '_strikes', type: 'uint256[]', internalType: 'uint256[]' }],
    outputs: [],
    stateMutability: 'pure',
  },

  // ============ Write Functions (user-facing) ============
  {
    type: 'function',
    name: 'payout',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'close',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'split',
    inputs: [{ name: 'splitCollateralAmount', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'isBuyer', type: 'bool', internalType: 'bool' },
      { name: 'target', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reclaimCollateral',
    inputs: [{ name: 'ownedOption', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'returnExcessCollateral',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },

  // ============ Events ============
  {
    type: 'event',
    name: 'OptionInitialized',
    inputs: [
      { name: 'buyer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'seller', type: 'address', indexed: true, internalType: 'address' },
      { name: 'createdBy', type: 'address', indexed: true, internalType: 'address' },
      { name: 'optionType', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'collateralToken', type: 'address', indexed: false, internalType: 'address' },
      { name: 'priceFeed', type: 'address', indexed: false, internalType: 'address' },
      { name: 'strikes', type: 'uint256[]', indexed: false, internalType: 'uint256[]' },
      { name: 'expiryTimestamp', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'numContracts', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'collateralAmount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'extraOptionData', type: 'bytes', indexed: false, internalType: 'bytes' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OptionClosed',
    inputs: [
      { name: 'optionAddress', type: 'address', indexed: true, internalType: 'address' },
      { name: 'closedBy', type: 'address', indexed: true, internalType: 'address' },
      { name: 'collateralReturned', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OptionExpired',
    inputs: [
      { name: 'optionAddress', type: 'address', indexed: true, internalType: 'address' },
      { name: 'settlementPrice', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OptionPayout',
    inputs: [
      { name: 'optionAddress', type: 'address', indexed: true, internalType: 'address' },
      { name: 'buyer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amountPaidOut', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OptionSettlementFailed',
    inputs: [],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OptionSplit',
    inputs: [
      { name: 'newOption', type: 'address', indexed: true, internalType: 'address' },
      { name: 'collateralAmount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'feePaid', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'counterparty', type: 'address', indexed: true, internalType: 'address' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ExcessCollateralReturned',
    inputs: [
      { name: 'seller', type: 'address', indexed: true, internalType: 'address' },
      { name: 'collateralToken', type: 'address', indexed: true, internalType: 'address' },
      { name: 'collateralReturned', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TransferApproval',
    inputs: [
      { name: 'target', type: 'address', indexed: true, internalType: 'address' },
      { name: 'from', type: 'address', indexed: true, internalType: 'address' },
      { name: 'isBuyer', type: 'bool', indexed: false, internalType: 'bool' },
      { name: 'isApproved', type: 'bool', indexed: false, internalType: 'bool' },
    ],
    anonymous: false,
  },
] as const;
