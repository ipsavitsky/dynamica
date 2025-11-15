/**
 * Hedera Testnet Deployed Contracts:
 *
 * Core Contracts:
 * - Factory: 0x42DDd2c74C8EE834Cb8d34397c78aB3673CA251e
 * - Mock Token (Base Token): 0xcA18eD1877466C5bD2208BDBF83C55cdd436f381
 * - Real Market: 0x8A780f6dCd0e3d99a1F697147Bf0155707028bD8
 * - Market Resolution Manager: 0xd26ef27ACdcb87Abe3B5d1333f87D1a3ac9843ae
 * - LSMR Math External: 0xE835cc1A7BcD1766928f62d612dC338c2c6623C8
 *
 * Oracle & Resolution Modules:
 * - ETH/USD Aggregator: 0x8d8E0f9a6EbE78756359095F35aF0032BBCf9D90
 * - BTC/USD Aggregator: 0x83F3F82244AA7B2B8FF10baA10eF5e50AAb7631E
 * - FTSO V2: 0xc7cf98DeA8e244D5B5E34870D451ED1BFb5B3570
 * - Resolution Module Chainlink (Implementation): 0xC196fb3e42DbaA76D6E0DbeC0F385B951519Ab84
 * - Resolution Module FTSO (Implementation): 0x303feaE5b34C19360E35E328FDe212F9695ea61d
 *
 * Dynamica Implementation:
 * - Dynamica (Implementation): 0x5d3046F879b275cd842aA771c0ebb6bFe2bcceD5
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
    baseTokenAddress: "0xcA18eD1877466C5bD2208BDBF83C55cdd436f381",
  },
};

const MARKETS: Record<number, Record<string, MarketConfig>> = {
  296: {
    crypto: {
      id: "crypto",
      address: "0x8A780f6dCd0e3d99a1F697147Bf0155707028bD8",
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
