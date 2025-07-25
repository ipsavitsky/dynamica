<script lang="ts">
  import "../app.css";
  import {
    Navbar,
    NavBrand,
    NavUl,
    NavLi,
    NavHamburger,
    Button,
  } from "flowbite-svelte";
  import { initializeAppKit } from "$lib/appkit";
  import { getTokenBalance, mintTokens } from "$lib/utils";
  import { browser } from "$app/environment";
  import { currentChainId, switchChain } from "$lib/chainManager";
  import { get } from "svelte/store";
  import { ethers } from "ethers";
  import { onMount } from "svelte";

  let { children } = $props();
  const appKit = initializeAppKit();
  let address = $state<string | null>(null);
  let tokenBalance = $state<{ balance: string; symbol: string } | null>(null);
  let isMinting = $state(false);
  let darkMode = $state(false);

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const toggleTheme = () => {
    darkMode = !darkMode;
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  };

  const getProvider = () => window.ethereum || appKit?.getProvider?.("eip155");

  const fetchTokenBalance = async (userAddress: string) => {
    try {
      const balance = await getTokenBalance(userAddress, get(currentChainId));
      tokenBalance = balance;
    } catch (error) {
      console.error("Failed to fetch token balance:", error);
      tokenBalance = { balance: "0.0", symbol: "MOCK" };
    }
  };

  const handleMint = async () => {
    if (!address || !appKit || isMinting) return;
    isMinting = true;
    try {
      const provider = getProvider();
      if (!provider) return;
      const signer = await new ethers.BrowserProvider(provider).getSigner();
      const success = await mintTokens(
        address,
        "10",
        signer,
        get(currentChainId),
      );
      if (success) await fetchTokenBalance(address);
    } catch (error) {
      console.error("Error during mint:", error);
    } finally {
      isMinting = false;
    }
  };

  onMount(() => {
    const savedTheme = localStorage.getItem("theme");
    darkMode =
      savedTheme === "dark" ||
      (!savedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", darkMode);

    if (browser && window.ethereum) {
      window.ethereum.on("chainChanged", (chainId: string) => {
        switchChain(parseInt(chainId, 16));
        if (address) fetchTokenBalance(address);
      });
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        address = accounts[0] || null;
        if (address) fetchTokenBalance(address);
        else tokenBalance = null;
      });
    }
  });

  $effect(() => {
    if (appKit) {
      return appKit.subscribeAccount((acc) => {
        address = acc.address ?? null;
        if (address) fetchTokenBalance(address);
        else tokenBalance = null;
      });
    }
  });

  $effect(() => {
    if (address) fetchTokenBalance(address);
  });
</script>

<div class="theme-surface min-h-screen transition-colors duration-300">
  <header class="theme-card theme-border w-full border-b shadow-sm">
    <Navbar class="mx-auto max-w-screen-xl px-4">
      <NavBrand href="/">
        <span
          class="theme-text self-center text-xl font-semibold whitespace-nowrap"
          style="font-family: 'Zen Dots', cursive;"
        >
          dynamica
        </span>
      </NavBrand>
      <NavHamburger />
      <div
        class="ml-3 flex items-center space-x-3 md:order-2 rtl:space-x-reverse"
      >
        <!-- Theme Toggle Button -->
        <Button
          size="sm"
          class="theme-card theme-text p-2 hover:opacity-80"
          onclick={toggleTheme}
        >
          {#if darkMode}
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                clip-rule="evenodd"
              ></path>
            </svg>
          {:else}
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
              ></path>
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
                {isMinting ? "..." : "+10"}
              </Button>
              {#if tokenBalance}
                <span
                  class="rounded-md bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                >
                  {tokenBalance.balance}
                  {tokenBalance.symbol}
                </span>
              {/if}
              <Button
                class="theme-card theme-text hover:opacity-80"
                onclick={() => appKit?.open({ view: "Account" })}
              >
                {formatAddress(address)}
              </Button>
            </div>
          {:else}
            <Button class="theme-btn-primary" onclick={() => appKit?.open()}>
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
