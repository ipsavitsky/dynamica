// Re-export all configuration types and functions
export * from './chains';
export * from './markets';

// Main configuration interface
export interface MultichainConfig {
  chains: Record<number, import('./chains').ChainConfig>;
  markets: Record<number, Record<string, import('./markets').MarketConfig>>;
  defaultChainId: number;
}

// Import chain-aware functions
import { getMarketConfig, getMarketAddress } from './markets';
import { getChainConfig, getDefaultChainConfig, getAvailableChains, DEFAULT_CHAIN_ID } from './chains';

export function getBaseTokenAddress(): string {
  const chainConfig = getDefaultChainConfig();
  return chainConfig.baseTokenAddress;
}

// Export chain-aware functions with clear names
export { 
  getMarketConfig as getMarketConfigByChain,
  getMarketAddress as getMarketAddressByChain,
  getChainConfig,
  getDefaultChainConfig,
  getAvailableChains,
  DEFAULT_CHAIN_ID
}; 