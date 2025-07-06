import { browser } from '$app/environment'
import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, defineChain } from '@reown/appkit/networks'

// Define Hedera testnet configuration
const hederaTestnet = defineChain({
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
});

// Define a type for the AppKit instance to be used throughout the app
export type AppKit = ReturnType<typeof createAppKit>;
let appKit: AppKit | undefined = undefined;

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

		const networks = [hederaTestnet, mainnet] as [typeof hederaTestnet, typeof mainnet];

		// Create adapter
		const ethersAdapter = new EthersAdapter();

		// Initialize AppKit
		appKit = createAppKit({
			adapters: [ethersAdapter],
			networks: [...networks],
			defaultNetwork: hederaTestnet,
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
