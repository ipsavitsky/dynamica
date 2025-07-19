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
  114: {
    id: 114,
    name: "Coston2 Testnet",
    nativeCurrency: { decimals: 18, name: "CFLR", symbol: "CFLR" },
    rpcUrls: {
      default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] },
    },
    blockExplorers: {
      default: {
        name: "Coston2 Explorer",
        url: "https://coston2-explorer.flare.network",
      },
    },
    baseTokenAddress: "0x61cE7ff8792faA0588AD69e22F9b88AAC6f409F7",
  },
  296: {
    id: 296,
    name: "Hedera Testnet",
    nativeCurrency: { decimals: 18, name: "HBAR", symbol: "HBAR" },
    rpcUrls: { default: { http: ["https://testnet.hashio.io/api"] } },
    blockExplorers: {
      default: { name: "HashScan", url: "https://hashscan.io/testnet" },
    },
    baseTokenAddress: "0x6c024E280439EEC7f0e816151ef53659F1155af9",
  },
  545: {
    id: 545,
    name: "Flow EVM Testnet",
    nativeCurrency: { decimals: 18, name: "FLOW", symbol: "FLOW" },
    rpcUrls: { default: { http: ["https://testnet.evm.nodes.onflow.org"] } },
    blockExplorers: {
      default: {
        name: "Flowscan EVM Testnet",
        url: "https://evm-testnet.flowscan.io",
      },
    },
    baseTokenAddress: "0xAB51568D34c67681156200feF7eA46ca0337b1E4",
  },
};

const MARKETS: Record<number, Record<string, MarketConfig>> = {
  114: {
    drivers: {
      id: "drivers",
      address: "0x9d127B8a587DD2fF08d24dA031eF1060625ae3f4",
      name: "Formula 1 Drivers Market",
      description: "Prediction market for Formula 1 driver performance",
      dataSource: "drivers",
      competitors: "drivers",
      enabled: true,
    },
    crypto: {
      id: "crypto",
      address: "0x01481e8f8a5480fCD7557102F48FeFdAA44b8279",
      name: "Ethereum/Bitcoin Market",
      description: "Prediction market for Ethereum/Bitcoin price movements",
      dataSource: "crypto-coingecko-eth-btc",
      competitors: "crypto",
      enabled: true,
    },
  },
  296: {
    crypto: {
      id: "crypto",
      address: "0x1d78d565c900F82CdF7a397a2a8D06c4B6335309",
      name: "Ethereum/Bitcoin Market",
      description: "Prediction market for Ethereum/Bitcoin price movements",
      dataSource: "crypto-coingecko-eth-btc",
      competitors: "crypto",
      enabled: true,
    },
  },
  545: {
    crypto: {
      id: "crypto",
      address: "0xA64bCFEB6250e2CB3DC858d2AFdd49DfD334FE5f",
      name: "Ethereum/Bitcoin Market",
      description: "Prediction market for Ethereum/Bitcoin price movements",
      dataSource: "crypto-coingecko-eth-btc",
      competitors: "crypto",
      enabled: true,
    },
  },
};

export const DEFAULT_CHAIN_ID = 545;

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
