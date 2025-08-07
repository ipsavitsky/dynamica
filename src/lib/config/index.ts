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
  297: {
    id: 297,
    name: "Hedera Previewnet",
    nativeCurrency: { decimals: 18, name: "HBAR", symbol: "HBAR" },
    rpcUrls: { default: { http: ["https://previewnet.hashio.io/api"] } },
    blockExplorers: {
      default: { name: "HashScan", url: "https://hashscan.io/previewnet" },
    },
    baseTokenAddress: "0xe59d6bF014a6ca45249ddC504E554cb8B58547Ed",
  },
};

const MARKETS: Record<number, Record<string, MarketConfig>> = {
  297: {
    crypto: {
      id: "crypto",
      address: "0xafE26eDC44b51B29fbe05744Bf682a5112D04fA8",
      name: "Ethereum/Bitcoin Market",
      description: "Prediction market for Ethereum/Bitcoin price movements",
      dataSource: "crypto-coingecko-eth-btc",
      competitors: "crypto",
      enabled: true,
    },
  },
};

export const DEFAULT_CHAIN_ID = 297;

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
