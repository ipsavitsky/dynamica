export interface MarketConfig {
  id: string;
  address: string;
  name: string;
  description: string;
  dataSource: string; // Reference to data source ID from dataSources.ts
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
      dataSource: 'drivers', // References 'drivers' data source
      competitors: 'drivers', // Will be refined to reference competitor set config
      enabled: true
    },
    'crypto': {
      id: 'crypto',
      address: "0x01481e8f8a5480fCD7557102F48FeFdAA44b8279",
      name: "Ethereum/Bitcoin Market",
      description: "Prediction market for Ethereum/Bitcoin price movements",
      dataSource: 'crypto-coingecko-eth-btc', // References fixture data source
      competitors: 'crypto', // Will be refined to reference competitor set config
      enabled: true
    }
  },
  // Hedera Testnet - Only crypto market
  296: {
    'crypto': {
      id: 'crypto',
      address: "0x1d78d565c900F82CdF7a397a2a8D06c4B6335309",
      name: "Ethereum/Bitcoin Market",
      description: "Prediction market for Ethereum/Bitcoin price movements",
      dataSource: 'crypto-coingecko-eth-btc', // References fixture data source
      competitors: 'crypto',
      enabled: true
    }
  },
  // Flow EVM Testnet - ETH/BTC market deployed
  545: {
    'crypto': {
      id: 'crypto',
      address: "0xA64bCFEB6250e2CB3DC858d2AFdd49DfD334FE5f", // market eth btc
      name: "Ethereum/Bitcoin Market",
      description: "Prediction market for Ethereum/Bitcoin price movements",
      dataSource: 'crypto-coingecko-eth-btc', // References CoinGecko data source
      competitors: 'crypto',
      enabled: true // Now deployed
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

export function getMarketDataSource(chainId: number, marketId: string): string | null {
  const config = getMarketConfig(chainId, marketId);
  return config ? config.dataSource : null;
} 