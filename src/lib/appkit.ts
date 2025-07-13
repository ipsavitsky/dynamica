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
        http: chainConfig.rpcUrls.default.http,
      },
    },
    blockExplorers: chainConfig.blockExplorers ? {
      default: {
        name: chainConfig.blockExplorers.default.name,
        url: chainConfig.blockExplorers.default.url,
      },
    } : undefined,
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
		
		// Convert to Reown AppKit format and ensure we have at least one chain
		const reownChains = availableChains.map(createReownChain);
		
		if (reownChains.length === 0) {
			throw new Error('No chains configured');
		}
		
		// Get default chain
		const defaultChain = createReownChain(getDefaultChainConfig());
		
		console.log('AppKit chains:', reownChains);
		console.log('Default chain:', defaultChain);

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

/**
 * Switch the wallet to a specific network using window.ethereum
 */
export async function switchWalletNetwork(chainId: number): Promise<boolean> {
	if (!browser || !window.ethereum) {
		console.error('No wallet available');
		return false;
	}

	// Get the chain configuration
	const availableChains = getAvailableChains();
	const chainConfig = availableChains.find(chain => chain.id === chainId);
	if (!chainConfig) {
		console.error(`Chain ${chainId} not found in configuration`);
		return false;
	}

	try {
		// Try to switch network using wallet_switchEthereumChain
		await window.ethereum.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: `0x${chainId.toString(16)}` }],
		});
		
		console.log(`Successfully switched wallet to ${chainConfig.name}`);
		return true;
	} catch (switchError: any) {
		// This error code indicates that the chain has not been added to MetaMask
		if (switchError.code === 4902) {
			try {
				// Add the chain to MetaMask
				await window.ethereum.request({
					method: 'wallet_addEthereumChain',
					params: [{
						chainId: `0x${chainId.toString(16)}`,
						chainName: chainConfig.name,
						nativeCurrency: chainConfig.nativeCurrency,
						rpcUrls: chainConfig.rpcUrls.default.http,
						blockExplorerUrls: chainConfig.blockExplorers ? [chainConfig.blockExplorers.default.url] : undefined,
					}],
				});
				
				console.log(`Successfully added and switched to ${chainConfig.name}`);
				return true;
			} catch (addError) {
				console.error('Failed to add chain to wallet:', addError);
				return false;
			}
		} else {
			console.error('Failed to switch wallet network:', switchError);
			return false;
		}
	}
}
