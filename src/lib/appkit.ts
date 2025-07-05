import { browser } from '$app/environment'
import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { arbitrum, mainnet } from '@reown/appkit/networks'

// Define a type for the AppKit instance to be used throughout the app
export type AppKit = ReturnType<typeof createAppKit>;
type AppKitNetwork = typeof arbitrum | typeof mainnet;

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

		const networks: [AppKitNetwork, ...AppKitNetwork[]] = [arbitrum, mainnet];

		// Create adapter
		const ethersAdapter = new EthersAdapter();

		// Initialize AppKit
		appKit = createAppKit({
			adapters: [ethersAdapter],
			networks,
			defaultNetwork: mainnet,
			projectId,
			metadata: {
				name: 'Market DApp',
				description: 'A decentralized market application',
				url: window.location.origin,
				icons: [`${window.location.origin}/favicon.png`]
			}
		});

		return appKit;
	}
}