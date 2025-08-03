<script lang="ts">
  import "../app.css";
  import { Button } from "$lib/components/ui/button/index";
  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index";
  import { navigationMenuTriggerStyle } from "$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte";
  import { initializeAppKit } from "$lib/appkit";
  import { getTokenBalance, mintTokens } from "$lib/blockchain";
  import { browser } from "$app/environment";
  import { currentChainId } from "$lib/chainManager";
  import { ethers } from "ethers";
  import { ModeWatcher, toggleMode } from "mode-watcher";
  import Sun from "@lucide/svelte/icons/sun";
  import Moon from "@lucide/svelte/icons/moon";

  let { children } = $props();
  const appKit = initializeAppKit();
  let address = $state<string | null>(null);
  let tokenBalance = $state<{ balance: string; symbol: string } | null>(null);
  let isMinting = $state(false);

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getProvider = () => window.ethereum || appKit?.getProvider?.("eip155");

  const fetchTokenBalance = async (userAddress: string) => {
    try {
      tokenBalance = await getTokenBalance(userAddress, currentChainId);
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
      const success = await mintTokens(address, "10", signer, currentChainId);
      if (success) await fetchTokenBalance(address);
    } catch (error) {
      console.error("Error during mint:", error);
    } finally {
      isMinting = false;
    }
  };

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

<header>
  <NavigationMenu.Root class="p-5">
    <NavigationMenu.List>
      <NavigationMenu.Item>
        <NavigationMenu.Link>
          {#snippet child()}
            <a href="/" class={navigationMenuTriggerStyle()}>
              <span
                class="theme-text self-center text-2xl font-semibold whitespace-nowrap"
                style="font-family: 'Zen Dots', cursive;"
              >
                dynamica
              </span>
            </a>
          {/snippet}
        </NavigationMenu.Link>
      </NavigationMenu.Item>
      <NavigationMenu.Item>
        <Button onclick={toggleMode}>
          <Moon class="h-4 w-4 dark:scale-0" />
          <Sun class="absolute h-4 w-4 scale-0 dark:scale-100" />
        </Button>
      </NavigationMenu.Item>
      <NavigationMenu.Item>
        {#if browser}
          {#if address}
            <Button onclick={handleMint} disabled={isMinting}>
              {isMinting ? "..." : "+10"}
            </Button>
            {#if tokenBalance}
              <span class="rounded-md">
                {tokenBalance.balance}
                {tokenBalance.symbol}
              </span>
            {/if}
            <Button onclick={() => appKit?.open({ view: "Account" })}>
              {formatAddress(address)}
            </Button>
          {:else}
            <Button onclick={() => appKit?.open()}>Connect Wallet</Button>
          {/if}
        {/if}
      </NavigationMenu.Item>
    </NavigationMenu.List>
  </NavigationMenu.Root>
</header>

<main>
  <ModeWatcher />
  {@render children()}
</main>
