import { browser } from '$app/environment'
import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, defineChain } from '@reown/appkit/networks'

// Define Coston2 testnet configuration
const coston2Network = defineChain({
	id: 114,
	caipNetworkId: 'eip155:114',
	chainNamespace: 'eip155',
	name: 'Coston2 Testnet',
	nativeCurrency: {
		decimals: 18,
		name: 'Coston2 Flare',
		symbol: 'C2FLR',
	},
	rpcUrls: {
		default: {
			http: ['https://coston-api.flare.network/ext/C/rpc'],
		},
	},
	blockExplorers: {
		default: {
			name: 'Coston2 Explorer',
			url: 'https://coston2-explorer.flare.network',
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

		const networks = [coston2Network, mainnet] as [typeof coston2Network, typeof mainnet];

		// Create adapter
		const ethersAdapter = new EthersAdapter();

		// Initialize AppKit
		appKit = createAppKit({
			adapters: [ethersAdapter],
			networks: [...networks],
			defaultNetwork: coston2Network,
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
