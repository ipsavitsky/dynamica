export interface MarketConfig {
  id: string;
  address: string;
  name: string;
  description: string;
  dataSource: string; // Reference to data source (will be refined later)
  competitors: string; // Reference to competitor set (will be refined later)
  enabled: boolean;
}

export const CHAIN_MARKETS: Record<number, Record<string, MarketConfig>> = {
  // Coston2 Testnet (Flare) - All markets available
  114: {
    'drivers': {
      id: 'drivers',
      address: "0x9d127B8a587DD2fF08d24dA031eF1060625ae3f4",
      name: "Formula 1 Drivers Market",
      description: "Prediction market for Formula 1 driver performance",
      dataSource: 'drivers', // Will be refined to reference data source config
      competitors: 'drivers', // Will be refined to reference competitor set config
      enabled: true
    },
    'crypto': {
      id: 'crypto',
      address: "0x01481e8f8a5480fCD7557102F48FeFdAA44b8279",
      name: "Cryptocurrency Market",
      description: "Prediction market for cryptocurrency price movements",
      dataSource: 'crypto', // Will be refined to reference data source config
      competitors: 'crypto', // Will be refined to reference competitor set config
      enabled: true
    }
  },
  // Ethereum Mainnet - Placeholder markets
  1: {
    'drivers': {
      id: 'drivers',
      address: "0x0000000000000000000000000000000000000000", // Placeholder
      name: "Formula 1 Drivers Market",
      description: "Prediction market for Formula 1 driver performance",
      dataSource: 'drivers',
      competitors: 'drivers',
      enabled: false // Not deployed yet
    },
    'crypto': {
      id: 'crypto',
      address: "0x0000000000000000000000000000000000000000", // Placeholder
      name: "Cryptocurrency Market",
      description: "Prediction market for cryptocurrency price movements",
      dataSource: 'crypto',
      competitors: 'crypto',
      enabled: false // Not deployed yet
    }
  },
  // Polygon - Only crypto market
  137: {
    'crypto': {
      id: 'crypto',
      address: "0x0000000000000000000000000000000000000000", // Placeholder
      name: "Cryptocurrency Market",
      description: "Prediction market for cryptocurrency price movements",
      dataSource: 'crypto',
      competitors: 'crypto',
      enabled: false // Not deployed yet
    }
  }
};

export function getMarketConfig(chainId: number, marketId: string): MarketConfig | null {
  const chainMarkets = CHAIN_MARKETS[chainId];
  if (!chainMarkets) return null;
  
  return chainMarkets[marketId] || null;
}

export function getMarketAddress(chainId: number, marketId: string): string | null {
  const config = getMarketConfig(chainId, marketId);
  return config ? config.address : null;
}

export function getAvailableMarkets(chainId: number): MarketConfig[] {
  const chainMarkets = CHAIN_MARKETS[chainId];
  if (!chainMarkets) return [];
  
  return Object.values(chainMarkets);
}

export function isMarketAvailable(chainId: number, marketId: string): boolean {
  const config = getMarketConfig(chainId, marketId);
  if (!config) return false;
  
  // Check if market is enabled and has a valid address
  return config.enabled && config.address !== "0x0000000000000000000000000000000000000000";
} 