<script lang="ts">
	import '../app.css';
	import { Navbar, NavBrand, NavUl, NavLi, NavHamburger, Button } from 'flowbite-svelte';
	import { initializeAppKit } from '$lib/appkit';

	let { children } = $props();

	const appKitPromise = initializeAppKit();


</script>

{#await appKitPromise}
	<p>Loading...</p>
{:then appKit}
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
					<Button
						onclick={() => {
							console.log('Connect Wallet button clicked');
							console.log('appKit instance:', appKit);
							appKit?.open();
						}}>Connect Wallet</Button
					>
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
{:catch error}
	<p class="p-8 text-red-500">Error initializing AppKit: {error.message}</p>
{/await}
