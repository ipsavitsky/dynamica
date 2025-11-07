/**
 * Hedera Testnet Deployed Contracts:
 *
 * Core Contracts:
 * - Factory: 0x99589da2f5d1c63CF0158D65b4f1B39Cfd4b639D
 * - Mock Token (Base Token): 0x2B61Aac649b806B63B72Aa21ED781D03E11A93aC
 * - Market Maker: 0xF0a629a91efa2b77ab54775b03bF0f617961fAb5
 * - Market Resolution Manager: 0xb555Cf2f92Ca6778b556301e0C4516a5015e5f9b
 *
 * Oracle & Resolution Modules:
 * - ETH/USD Aggregator: 0xEbB95805793153e2a0E009BE428fc7f38c9A3432
 * - BTC/USD Aggregator: 0x52aE00C725BB1dB0788f8e0496748e8DAE7C3580
 * - FTSO V2: 0xbd1A70c6775b1E67D9c06E6a4a7387350EE24259
 * - Resolution Module Chainlink (Implementation): 0x61F5B93e26d078C99351f90949758784CDA9c5F4
 * - Resolution Module FTSO (Implementation): 0xE4D493ECf7FFD6D79f80cf0763a2498c406F547D
 *
 * Dynamica Implementation:
 * - Dynamica (Implementation): 0xEA395Df1ACc41B9139c815B798207379833f9323
 */

export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: string[] } };
  blockExplorers?: { default: { name: string; url: string } };
  baseTokenAddress: string;
}

export interface MarketConfig {
  id: string;
  address: string;
  name: string;
  description: string;
  dataSource: string;
  competitors: string;
  enabled: boolean;
}

const CHAINS: Record<number, ChainConfig> = {
  296: {
    id: 296,
    name: "Hedera Testnet",
    nativeCurrency: { decimals: 18, name: "HBAR", symbol: "HBAR" },
    rpcUrls: { default: { http: ["https://testnet.hashio.io/api"] } },
    blockExplorers: {
      default: { name: "HashScan", url: "https://hashscan.io/testnet" },
    },
    baseTokenAddress: "0x2B61Aac649b806B63B72Aa21ED781D03E11A93aC",
  },
};

const MARKETS: Record<number, Record<string, MarketConfig>> = {
  296: {
    crypto: {
      id: "crypto",
      address: "0xF0a629a91efa2b77ab54775b03bF0f617961fAb5",
      name: "Ethereum/Bitcoin Market",
      description: "Prediction market for Ethereum/Bitcoin price movements",
      dataSource: "crypto-coingecko-eth-btc",
      competitors: "crypto",
      enabled: true,
    },
  },
};

export const DEFAULT_CHAIN_ID = 296;

export const getChainConfig = (chainId: number): ChainConfig | null =>
  CHAINS[chainId] || null;

export const getDefaultChainConfig = (): ChainConfig =>
  CHAINS[DEFAULT_CHAIN_ID];

export const getAvailableChains = (): ChainConfig[] => Object.values(CHAINS);

export const getBaseTokenAddress = (chainId?: number): string =>
  (chainId ? getChainConfig(chainId) : getDefaultChainConfig())
    ?.baseTokenAddress || getDefaultChainConfig().baseTokenAddress;

export const getMarketConfig = (
  chainId: number,
  marketId: string,
): MarketConfig | null => MARKETS[chainId]?.[marketId] || null;

export const getMarketAddress = (
  chainId: number,
  marketId: string,
): string | null => getMarketConfig(chainId, marketId)?.address || null;

export const getAvailableMarkets = (chainId: number): MarketConfig[] =>
  Object.values(MARKETS[chainId] || {});

export const isMarketAvailable = (
  chainId: number,
  marketId: string,
): boolean => {
  const config = getMarketConfig(chainId, marketId);
  return (
    (config?.enabled ?? false) &&
    config?.address !== "0x0000000000000000000000000000000000000000"
  );
};

export const getMarketDataSource = (
  chainId: number,
  marketId: string,
): string | null => getMarketConfig(chainId, marketId)?.dataSource || null;
