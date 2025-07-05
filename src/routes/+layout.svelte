<script lang="ts">
	import '../app.css';
	import { Navbar, NavBrand, NavUl, NavLi, NavHamburger, Button } from 'flowbite-svelte';
	import { initializeAppKit } from '$lib/appkit';
	import { getTokenBalance, mintTokens } from '$lib/utils';
	import { browser } from '$app/environment';
	import { ethers } from 'ethers';

	let { children } = $props();

	const appKit = initializeAppKit();

	let address = $state<string | null>(null);
	let tokenBalance = $state<{ balance: string; symbol: string } | null>(null);
	let isMinting = $state(false);

	$effect(() => {
		if (appKit) {
			const unsubscribe = appKit.subscribeAccount(acc => {
				address = acc.address ?? null;
				if (address) {
					fetchTokenBalance(address);
				} else {
					tokenBalance = null;
				}
			});

			return unsubscribe;
		}
	});

	async function fetchTokenBalance(userAddress: string) {
		if (!appKit) {
			console.log('AppKit not available');
			return;
		}
		
		try {
			console.log('Fetching token balance for:', userAddress);
			
			// Try different methods to get provider
			let provider;
			if (typeof appKit.getProvider === 'function') {
				provider = appKit.getProvider();
			} else if (typeof appKit.getWalletProvider === 'function') {
				provider = appKit.getWalletProvider();
			} else {
				console.log('Available appKit methods:', Object.keys(appKit));
			}
			
			if (provider) {
				console.log('Provider found, creating ethers provider');
				const ethersProvider = new ethers.BrowserProvider(provider);
				const balance = await getTokenBalance(userAddress, ethersProvider);
				console.log('Token balance fetched:', balance);
				tokenBalance = balance;
			} else {
				console.log('No provider available');
				// Fallback: try to create provider with window.ethereum
				if (typeof window !== 'undefined' && window.ethereum) {
					console.log('Using window.ethereum as fallback');
					const ethersProvider = new ethers.BrowserProvider(window.ethereum);
					const balance = await getTokenBalance(userAddress, ethersProvider);
					console.log('Token balance fetched with fallback:', balance);
					tokenBalance = balance;
				}
			}
		} catch (error) {
			console.error('Failed to fetch token balance:', error);
			tokenBalance = null;
		}
	}

	async function handleMint() {
		if (!address || !appKit || isMinting) return;
		
		isMinting = true;
		
		try {
			console.log('Starting mint process...');
			console.log('AppKit methods:', Object.keys(appKit));
			
			// Try to get the provider using AppKit's connection
			let provider;
			
			// First try the caip connection
			if (appKit.getCaipAddress) {
				console.log('Using CAIP connection');
				const caipAddress = appKit.getCaipAddress();
				console.log('CAIP address:', caipAddress);
			}
			
			// Try different methods to get provider
			if (appKit.getProvider) {
				provider = appKit.getProvider();
				console.log('Got provider via getProvider');
			} else if (appKit.getWalletProvider) {
				provider = appKit.getWalletProvider();
				console.log('Got provider via getWalletProvider');
			} else if (appKit.provider) {
				provider = appKit.provider;
				console.log('Got provider via .provider property');
			}
			
			// Fallback to window.ethereum
			if (!provider && typeof window !== 'undefined' && window.ethereum) {
				provider = window.ethereum;
				console.log('Using window.ethereum as fallback');
			}
			
			if (!provider) {
				console.error('No provider available for minting');
				console.log('Available appKit properties:', Object.keys(appKit));
				return;
			}
			
			console.log('Provider found:', provider);
			
			const ethersProvider = new ethers.BrowserProvider(provider);
			const signer = await ethersProvider.getSigner();
			
			console.log('Signer created, minting 10 tokens...');
			const success = await mintTokens(address, '10', signer);
			
			if (success) {
				console.log('Mint successful, refreshing balance...');
				// Refresh balance after successful mint
				await fetchTokenBalance(address);
			} else {
				console.error('Mint failed');
			}
		} catch (error) {
			console.error('Error during mint:', error);
		} finally {
			isMinting = false;
		}
	}


	function formatAddress(addr: string) {
		return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
	}
</script>

<div class="bg-gray-50 dark:bg-gray-900 min-h-screen">
	<header class="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
		<Navbar class="max-w-screen-xl mx-auto px-4">
			<NavBrand href="/">
				<span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
					Placeholder
				</span>
			</NavBrand>
			<NavHamburger />
			<div class="flex items-center md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse ml-3">
				{#if browser}
					{#if address}
						<div class="flex items-center space-x-2">
							<Button
								size="sm"
								color="green"
								onclick={handleMint}
								disabled={isMinting}
								class="px-2 py-1 text-xs"
							>
								{isMinting ? '...' : '+10'}
							</Button>
							{#if tokenBalance}
								<span class="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
									{tokenBalance.balance} {tokenBalance.symbol}
								</span>
							{/if}
							<Button color="light" onclick={() => appKit?.open({ view: 'Account' })}>{formatAddress(address)}</Button>
						</div>
					{:else}
						<Button onclick={() => appKit?.open()}>Connect Wallet</Button>
					{/if}
				{/if}
			</div>
			<NavUl>
				<NavLi href="/">Home</NavLi>
				<NavLi href="/about">About</NavLi>
				<NavLi href="/services">Services</NavLi>
				<NavLi href="/contact">Contact</NavLi>
			</NavUl>
		</Navbar>
	</header>

	<main class="p-8">
		{@render children()}
	</main>
</div>
