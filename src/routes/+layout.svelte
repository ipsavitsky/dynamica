<script lang="ts">
	import '../app.css';
	import { Navbar, NavBrand, NavUl, NavLi, NavHamburger, Button } from 'flowbite-svelte';
	import { initializeAppKit } from '$lib/appkit';
	import { getTokenBalance, mintTokens } from '$lib/utils';
	import { browser } from '$app/environment';
	import { ethers } from 'ethers';
	import { onMount } from 'svelte';

	let { children } = $props();

	const appKit = initializeAppKit();

	let address = $state<string | null>(null);
	let tokenBalance = $state<{ balance: string; symbol: string } | null>(null);
	let isMinting = $state(false);
	let darkMode = $state(false);

	onMount(() => {
		// Check for saved theme preference or default to light mode
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
			darkMode = true;
			document.documentElement.classList.add('dark');
		} else {
			darkMode = false;
			document.documentElement.classList.remove('dark');
		}
	});

	function toggleTheme() {
		darkMode = !darkMode;
		if (darkMode) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

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

	async function getProvider() {
		if (!appKit) {
			console.log('AppKit not available');
			return null;
		}

		console.log('AppKit available:', !!appKit);
		console.log('AppKit methods:', Object.keys(appKit));

		let provider;

		// Try window.ethereum first as it usually works best for contract interactions
		if (typeof window !== 'undefined' && window.ethereum) {
			provider = window.ethereum;
			console.log('Using window.ethereum as primary provider');
		} else if (appKit.getProvider) {
			provider = appKit.getProvider('eip155');
			console.log('getProvider() returned:', provider);
		} else if (appKit.getWalletProvider) {
			provider = appKit.getWalletProvider();
			console.log('Got provider via getWalletProvider');
		}

		if (!provider) {
			console.error('No provider available');
			console.log('Available appKit properties:', Object.keys(appKit));
			return null;
		}

		console.log('Provider found:', provider);
		return provider;
	}

	async function fetchTokenBalance(userAddress: string) {
		if (!appKit) {
			console.log('AppKit not available');
			return;
		}

		try {
			console.log('Fetching token balance for:', userAddress);

			// Add a small delay to ensure wallet is properly connected
			await new Promise(resolve => setTimeout(resolve, 500));

			const provider = await getProvider();
			if (!provider) {
				console.log('No provider available');
				return;
			}

			console.log('Fetching token balance with dedicated provider');
			const balance = await getTokenBalance(userAddress);
			console.log('Token balance fetched:', balance);
			tokenBalance = balance;
		} catch (error) {
			console.error('Failed to fetch token balance:', error);
			// Set a fallback value instead of null to show something in the UI
			tokenBalance = {
				balance: '0.0',
				symbol: 'MOCK'
			};
		}
	}

	async function handleMint() {
		if (!address || !appKit || isMinting) return;

		isMinting = true;

		try {
			console.log('Starting mint process...');

			const provider = await getProvider();
			if (!provider) {
				console.error('No provider available for minting');
				return;
			}

			console.log('Provider found, creating signer...');
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

<div class="theme-surface min-h-screen transition-colors duration-300">
	<header class="w-full theme-card border-b theme-border shadow-sm">
		<Navbar class="max-w-screen-xl mx-auto px-4">
			<NavBrand href="/">
				<span class="self-center whitespace-nowrap text-xl font-semibold theme-text" style="font-family: 'Zen Dots', cursive;">
				dynamica
				</span>
			</NavBrand>
			<NavHamburger />
			<div class="flex items-center md:order-2 space-x-3 rtl:space-x-reverse ml-3">
				<!-- Theme Toggle Button -->
				<Button
					size="sm"
					class="theme-card hover:opacity-80 theme-text p-2"
					onclick={toggleTheme}
				>
					{#if darkMode}
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
						</svg>
					{:else}
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
						</svg>
					{/if}
				</Button>

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
							<Button
								class="theme-card hover:opacity-80 theme-text"
								onclick={() => appKit?.open({ view: 'Account' })}
							>
								{formatAddress(address)}
							</Button>
						</div>
					{:else}
						<Button
							class="theme-btn-primary"
							onclick={() => appKit?.open()}
						>
							Connect Wallet
						</Button>
					{/if}
				{/if}
			</div>
			<NavUl>
				<NavLi href="/" class="theme-text hover:opacity-80">Home</NavLi>
				<NavLi href="/about" class="theme-text hover:opacity-80">About</NavLi>
			</NavUl>
		</Navbar>
	</header>

	<main class="transition-colors duration-300">
		{@render children()}
	</main>
</div>
