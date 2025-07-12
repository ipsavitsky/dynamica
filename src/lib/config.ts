// Re-export from new configuration structure
export * from './config/index';

// Legacy types for backward compatibility
export interface MarketConfig {
  address: string;
  name: string;
  description: string;
}

export interface PredictionMarketConfig {
  baseTokenAddress: string;
  markets: {
    crypto: MarketConfig;
    drivers: MarketConfig;
  };
}

// Legacy configuration (deprecated - use new structure)
export const PREDICTION_MARKET_CONFIG: PredictionMarketConfig = {
  baseTokenAddress: "0x61cE7ff8792faA0588AD69e22F9b88AAC6f409F7",
  markets: {
    crypto: {
      address: "0x01481e8f8a5480fCD7557102F48FeFdAA44b8279",
      name: "Cryptocurrency Market",
      description: "Prediction market for cryptocurrency price movements"
    },
    drivers: {
      address: "0x9d127B8a587DD2fF08d24dA031eF1060625ae3f4",
      name: "Formula 1 Drivers Market", 
      description: "Prediction market for Formula 1 driver performance"
    }
  }
};

// Legacy helper functions (deprecated - use new structure)
export function getMarketConfig(dataset: string): MarketConfig | null {
  if (dataset === 'crypto') {
    return PREDICTION_MARKET_CONFIG.markets.crypto;
  } else if (dataset === 'drivers') {
    return PREDICTION_MARKET_CONFIG.markets.drivers;
  }
  return null;
}

export function getMarketAddress(dataset: string): string | null {
  const config = getMarketConfig(dataset);
  return config ? config.address : null;
}

export function getBaseTokenAddress(): string {
  return PREDICTION_MARKET_CONFIG.baseTokenAddress;
}