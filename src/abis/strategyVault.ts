/**
 * StrategyVault Contract ABIs (Base Mainnet)
 *
 * ABIs for Kairos fixed-strike vaults and CLVEX directional/condor strategy vaults.
 * Both share the same BaseVault interface.
 */

/** BaseVault / FixedStrikeStrategyVault / DirectionalStrategyVault / MeanRevertingCondorStrategyVault */
export const STRATEGY_VAULT_ABI = [
  // --- ERC20 vault share interface ---
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',

  // --- Vault operations ---
  'function deposit(uint256 amount, uint8 assetIndex)',
  'function withdraw(uint256 shares)',

  // --- Vault state ---
  'function getTotalAssets() view returns (uint256[] assetValues, uint256[] pendingDepositValues, uint256[] optionCollateralValues, uint256 totalAssets)',
  'function activeRfqId() view returns (uint256)',
  'function isRfqActive() view returns (bool)',
  'function getActiveOptionsLengths() view returns (uint256[])',
  'function getNextExpiryTimestamp() view returns (uint256)',

  // --- Permissionless ---
  'function createOption()',

  // --- Events ---
  'event DepositQueued(address indexed user, uint256 amount, uint8 assetIndex)',
  'event SharesMinted(address indexed user, uint256 shares, uint256 amount, uint8 assetIndex)',
  'event ValuePerShareUpdated(uint256[] valuePerShare)',
  'event WithdrawalInitiated(address indexed user, uint256 shares, uint256[] amounts)',
  'event RecoveryModeTriggered()',
  'event OptionCreated(address optionContract, uint256 amount, uint8 assetIndex)',
  'event PendingDepositWithdrawn(address indexed user, uint256 amount, uint8 assetIndex)',
];
