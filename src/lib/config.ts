// Centralized configuration for prediction markets
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

export const PREDICTION_MARKET_CONFIG: PredictionMarketConfig = {
  // Base token address for prediction markets
  baseTokenAddress: "0x61cE7ff8792faA0588AD69e22F9b88AAC6f409F7",
  
  // Market configurations
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

// Helper function to get market configuration by dataset name
export function getMarketConfig(dataset: string): MarketConfig | null {
  if (dataset === 'crypto') {
    return PREDICTION_MARKET_CONFIG.markets.crypto;
  } else if (dataset === 'drivers') {
    return PREDICTION_MARKET_CONFIG.markets.drivers;
  }
  return null;
}

// Helper function to get market address by dataset name
export function getMarketAddress(dataset: string): string | null {
  const config = getMarketConfig(dataset);
  return config ? config.address : null;
}

// Get base token address
export function getBaseTokenAddress(): string {
  return PREDICTION_MARKET_CONFIG.baseTokenAddress;
}