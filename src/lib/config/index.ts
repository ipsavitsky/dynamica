// Re-export all configuration types and functions
export * from './chains';
export * from './markets';

// Main configuration interface
export interface MultichainConfig {
  chains: Record<number, import('./chains').ChainConfig>;
  markets: Record<number, Record<string, import('./markets').MarketConfig>>;
  defaultChainId: number;
}

// Legacy compatibility exports
import { getMarketConfig as getMarketConfigNew, getMarketAddress as getMarketAddressNew } from './markets';
import { getChainConfig, getDefaultChainConfig, getAvailableChains, DEFAULT_CHAIN_ID } from './chains';

// Legacy function signatures for backward compatibility
export function getMarketConfig(dataset: string): import('./markets').MarketConfig | null {
  return getMarketConfigNew(DEFAULT_CHAIN_ID, dataset);
}

export function getMarketAddress(dataset: string): string | null {
  return getMarketAddressNew(DEFAULT_CHAIN_ID, dataset);
}

export function getBaseTokenAddress(): string {
  const chainConfig = getDefaultChainConfig();
  return chainConfig.baseTokenAddress;
}

// New chain-aware functions
export { 
  getMarketConfigNew as getMarketConfigByChain,
  getMarketAddressNew as getMarketAddressByChain,
  getChainConfig,
  getDefaultChainConfig,
  getAvailableChains,
  DEFAULT_CHAIN_ID
}; 