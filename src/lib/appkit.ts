import { browser } from '$app/environment'
import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { defineChain } from '@reown/appkit/networks'
import { getAvailableChains, getDefaultChainConfig } from './config/chains'

// Define a type for the AppKit instance to be used throughout the app
export type AppKit = ReturnType<typeof createAppKit>;
let appKit: AppKit | undefined = undefined;

// Convert our chain config to Reown AppKit chain format
function createReownChain(chainConfig: any) {
  return defineChain({
    id: chainConfig.id,
    caipNetworkId: `eip155:${chainConfig.id}`,
    chainNamespace: 'eip155',
    name: chainConfig.name,
    nativeCurrency: chainConfig.nativeCurrency,
    rpcUrls: {
      default: {
        http: [chainConfig.rpcUrl],
      },
    },
    blockExplorers: {
      default: {
        name: `${chainConfig.name} Explorer`,
        url: chainConfig.blockExplorer,
      },
    },
  });
}

/**
 * Initializes and returns a singleton instance of the AppKit client.
 * This ensures that AppKit is initialized only once.
 */
export function initializeAppKit() {
	if (appKit) {
		return appKit;
	}

	if (browser) {
		const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;
		if (!projectId) {
			throw new Error('VITE_REOWN_PROJECT_ID is not set in your .env file');
		}

		// Get all available chains from our configuration
		const availableChains = getAvailableChains();
		
		// Convert to Reown AppKit format
		const reownChains = availableChains.map(createReownChain);
		
		// Get default chain
		const defaultChain = createReownChain(getDefaultChainConfig());

		// Create adapter
		const ethersAdapter = new EthersAdapter();

		// Initialize AppKit with all configured chains
		appKit = createAppKit({
			adapters: [ethersAdapter],
			networks: reownChains,
			defaultNetwork: defaultChain,
			projectId,
			metadata: {
				name: 'Market DApp',
				description: 'A decentralized market application',
				url: window.location.origin,
				icons: [`${window.location.origin}/favicon.png`]
			},
			features: {
				connectMethodsOrder: ['wallet']
			}
		});

		return appKit;
	}
}

/**
 * Get AppKit instance for a specific chain
 */
export function getAppKitForChain(chainId: number): AppKit | undefined {
	if (!appKit) {
		appKit = initializeAppKit();
	}
	
	// Verify the chain is supported
	const availableChains = getAvailableChains();
	const chainConfig = availableChains.find(chain => chain.id === chainId);
	if (!chainConfig) {
		console.error(`Chain ${chainId} is not supported`);
		return undefined;
	}
	
	return appKit;
}
