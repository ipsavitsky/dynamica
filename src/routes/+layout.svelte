<script lang="ts">
	import '../app.css';
	import { Navbar, NavBrand, NavUl, NavLi, NavHamburger } from 'flowbite-svelte';
	let { children } = $props();
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
			<NavUl>
				<NavLi href="/">Home</NavLi>
				<NavLi href="/about">About</NavLi>
				<NavLi href="/contact">Contact</NavLi>
			</NavUl>
		</Navbar>
	</header>

	<main class="p-8">
		{@render children()}
	</main>
</div>
