<script lang="ts">
	import '../app.css';
	import { Navbar, NavBrand, NavUl, NavLi, NavHamburger, Button } from 'flowbite-svelte';
	import { initializeAppKit } from '$lib/appkit';
	import { browser } from '$app/environment';

	let { children } = $props();

	const appKit = initializeAppKit();

	let address = $state<string | null>(null);

	$effect(() => {
		if (appKit) {
			const unsubscribe = appKit.subscribeAccount(acc => {
				address = acc.address ?? null;
			});

			return unsubscribe;
		}
	});

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
						<Button color="light" onclick={() => appKit?.open({ view: 'Account' })}>{formatAddress(address)}</Button>
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
