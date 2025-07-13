import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { 
  getChainConfig, 
  getAvailableChains, 
  getDefaultChainConfig, 
  DEFAULT_CHAIN_ID,
  type ChainConfig 
} from './config/chains';
import { 
  getAvailableMarkets, 
  isMarketAvailable,
  type MarketConfig 
} from './config/markets';

// Store for current chain ID
export const currentChainId = writable<number>(DEFAULT_CHAIN_ID);

// Store for current chain configuration
export const currentChain = derived(currentChainId, ($chainId) => {
  return getChainConfig($chainId);
});

// Store for available chains
export const availableChains = writable<ChainConfig[]>(getAvailableChains());

// Store for available markets on current chain
export const currentMarkets = derived(currentChain, ($chain) => {
  if (!$chain) return [];
  return getAvailableMarkets($chain.id);
});

// Store for available markets on current chain (only enabled ones)
export const availableCurrentMarkets = derived(currentMarkets, ($markets) => {
  return $markets.filter(market => market.enabled);
});

// Chain management functions
export function switchChain(chainId: number): boolean {
  const chainConfig = getChainConfig(chainId);
  if (!chainConfig) {
    console.error(`Chain ${chainId} not found in configuration`);
    return false;
  }
  
  currentChainId.set(chainId);
  
  // Store in localStorage for persistence
  if (browser) {
    localStorage.setItem('preferredChainId', chainId.toString());
  }
  
  return true;
}

export function getPreferredChain(): number {
  if (browser) {
    const stored = localStorage.getItem('preferredChainId');
    if (stored) {
      const chainId = parseInt(stored);
      if (getChainConfig(chainId)) {
        return chainId;
      }
    }
  }
  return DEFAULT_CHAIN_ID;
}

// Initialize with preferred chain
if (browser) {
  const preferredChainId = getPreferredChain();
  currentChainId.set(preferredChainId);
}

// Chain validation
export function isValidChain(chainId: number): boolean {
  return getChainConfig(chainId) !== null;
}

// Market validation for current chain
export function isValidMarket(chainId: number, marketId: string): boolean {
  return isMarketAvailable(chainId, marketId);
}

// Get market data source for a specific market
export function getMarketDataSource(chainId: number, marketId: string): string | null {
  const chainConfig = getChainConfig(chainId);
  if (!chainConfig) return null;
  
  const markets = getAvailableMarkets(chainId);
  const market = markets.find(m => m.id === marketId);
  return market ? market.dataSource : null;
}

// Get market competitors for a specific market
export function getMarketCompetitors(chainId: number, marketId: string): string | null {
  const chainConfig = getChainConfig(chainId);
  if (!chainConfig) return null;
  
  const markets = getAvailableMarkets(chainId);
  const market = markets.find(m => m.id === marketId);
  return market ? market.competitors : null;
} 