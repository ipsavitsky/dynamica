export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  baseTokenAddress: string;
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  // Coston2 Testnet (Flare)
  114: {
    id: 114,
    name: 'Coston2 Testnet',
    rpcUrl: 'https://coston-api.flare.network/ext/C/rpc',
    blockExplorer: 'https://coston2-explorer.flare.network',
    nativeCurrency: {
      name: 'Coston2 Flare',
      symbol: 'C2FLR',
      decimals: 18,
    },
    baseTokenAddress: "0x61cE7ff8792faA0588AD69e22F9b88AAC6f409F7",
  },
  // Ethereum Mainnet
  1: {
    id: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://ethereum.publicnode.com',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    baseTokenAddress: "0x0000000000000000000000000000000000000000", // Placeholder
  },
  // Polygon
  137: {
    id: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    baseTokenAddress: "0x0000000000000000000000000000000000000000", // Placeholder
  }
};

export const DEFAULT_CHAIN_ID = 114;

export function getChainConfig(chainId: number): ChainConfig | null {
  return SUPPORTED_CHAINS[chainId] || null;
}

export function getDefaultChainConfig(): ChainConfig {
  return SUPPORTED_CHAINS[DEFAULT_CHAIN_ID];
}

export function getAvailableChains(): ChainConfig[] {
  return Object.values(SUPPORTED_CHAINS);
} 