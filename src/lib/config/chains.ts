// No external imports needed - all chain definitions are internal

export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: {
      http: string[];
    };
  };
  blockExplorers?: {
    default: {
      name: string;
      url: string;
    };
  };
  baseTokenAddress: string;
}

// Single source of truth for chain configurations
const CHAIN_DEFINITIONS = {
  114: {
    id: 114,
    caipNetworkId: 'eip155:114',
    chainNamespace: 'eip155',
    name: 'Coston2 Testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'CFLR',
      symbol: 'CFLR',
    },
    rpcUrls: {
      default: {
        http: ['https://coston2-api.flare.network/ext/C/rpc'],
      },
    },
    blockExplorers: {
      default: {
        name: 'Coston2 Explorer',
        url: 'https://coston2-explorer.flare.network',
      },
    },
    baseTokenAddress: "0x61cE7ff8792faA0588AD69e22F9b88AAC6f409F7",
  },
  296: {
    id: 296,
    caipNetworkId: 'eip155:296',
    chainNamespace: 'eip155',
    name: 'Hedera Testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'HBAR',
      symbol: 'HBAR',
    },
    rpcUrls: {
      default: {
        http: ['https://testnet.hashio.io/api'],
      },
    },
    blockExplorers: {
      default: {
        name: 'HashScan',
        url: 'https://hashscan.io/testnet',
      },
    },
    baseTokenAddress: "0x6c024E280439EEC7f0e816151ef53659F1155af9",
  },
  545: { // Flow EVM Testnet
    id: 545,
    caipNetworkId: 'eip155:545',
    chainNamespace: 'eip155',
    name: 'Flow EVM Testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'FLOW',
      symbol: 'FLOW',
    },
    rpcUrls: {
      default: {
        http: ['https://testnet.evm.nodes.onflow.org'],
      },
    },
    blockExplorers: {
      default: {
        name: 'Flowscan EVM Testnet',
        url: 'https://evm-testnet.flowscan.io',
      },
    },
    baseTokenAddress: "0xAB51568D34c67681156200feF7eA46ca0337b1E4", // mockToken
  },
} as const;

// Note: Individual chain exports are not needed as AppKit creates chains dynamically
// from CHAIN_CONFIGS using createReownChain function

// Automatically generate ChainConfig objects
export const CHAIN_CONFIGS: Record<number, ChainConfig> = Object.fromEntries(
  Object.entries(CHAIN_DEFINITIONS).map(([chainId, chain]) => [
    chainId,
    {
      id: chain.id,
      name: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: {
        default: {
          http: [...chain.rpcUrls.default.http]
        }
      },
      blockExplorers: chain.blockExplorers,
      baseTokenAddress: chain.baseTokenAddress,
    }
  ])
);

export const DEFAULT_CHAIN_ID = 114; // Default to Coston2

export function getChainConfig(chainId: number): ChainConfig | null {
  return CHAIN_CONFIGS[chainId] || null;
}

export function getDefaultChainConfig(): ChainConfig {
  return CHAIN_CONFIGS[DEFAULT_CHAIN_ID];
}

export function getAvailableChains(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS);
} 