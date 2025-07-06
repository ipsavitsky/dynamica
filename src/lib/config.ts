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
  // Base token address for prediction markets (MockToken on Hedera)
  baseTokenAddress: "0x6c024E280439EEC7f0e816151ef53659F1155af9",
  
  // Market configurations
  markets: {
    crypto: {
      address: "0x1d78d565c900F82CdF7a397a2a8D06c4B6335309",
      name: "Cryptocurrency Market",
      description: "Prediction market for cryptocurrency price movements"
    },
    drivers: {
      address: "0x1d78d565c900F82CdF7a397a2a8D06c4B6335309",
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