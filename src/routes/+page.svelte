<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, A, Select, Button } from 'flowbite-svelte';
  import { currentChainId, currentChain, availableCurrentMarkets, availableChains, switchChain } from '$lib/chainManager';
  import { isMarketAvailable, getAvailableMarkets } from '$lib/config/markets';
  import { switchWalletNetwork } from '$lib/appkit';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';

  let selectedChainId = $state(get(currentChainId));
  let markets = $state(get(availableCurrentMarkets));
  let chains = $state(get(availableChains));
  let currentChainConfig = $state(get(currentChain));

  // Subscribe to store changes
  $effect(() => {
    selectedChainId = get(currentChainId);
    markets = get(availableCurrentMarkets);
    chains = get(availableChains);
    currentChainConfig = get(currentChain);
  });

  // Sync with wallet state on page load
  $effect(() => {
    if (browser && window.ethereum) {
      // Get current wallet chain and sync our state
      window.ethereum.request({ method: 'eth_chainId' })
        .then((chainId: string) => {
          const decimalChainId = parseInt(chainId, 16);
          if (decimalChainId !== selectedChainId) {
            console.log('Syncing page state with wallet chain:', decimalChainId);
            switchChain(decimalChainId);
          }
        })
        .catch((error: any) => {
          console.error('Failed to get wallet chain:', error);
        });
    }
  });

  async function handleChainChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newChainId = parseInt(target.value);
    
    // Update the UI state first
    if (switchChain(newChainId)) {
      selectedChainId = newChainId;
      
      // Try to switch the wallet network as well
      try {
        const walletSwitched = await switchWalletNetwork(newChainId);
        if (walletSwitched) {
          console.log('Wallet network switched successfully');
        } else {
          console.log('Wallet network switch failed, but UI updated');
        }
      } catch (error) {
        console.error('Error switching wallet network:', error);
        // UI is still updated even if wallet switch fails
      }
    }
  }

  function getMarketUrl(marketId: string): string {
    return `/market/${marketId}`;
  }

  // Reactive function to check if market is deployed on current chain
  const isMarketDeployed = $derived((marketId: string) => isMarketAvailable(selectedChainId, marketId));
</script>

<div class="min-h-screen theme-surface transition-colors duration-300">
  <div class="container mx-auto p-8">
    <h1 class="mb-8 text-center text-4xl font-bold theme-text">Select a Market</h1>
    
    <!-- Chain Selector -->
    <div class="mb-8 flex justify-center">
      <div class="w-full max-w-md">
        <label for="chain-select" class="block text-sm font-medium theme-text mb-2">
          Select Chain
        </label>
        <Select 
          id="chain-select"
          bind:value={selectedChainId} 
          onchange={(event) => handleChainChange(event)}
          class="theme-card theme-border theme-text"
        >
          {#each chains as chain}
            <option value={chain.id}>
              {chain.name} ({chain.nativeCurrency.symbol})
            </option>
          {/each}
        </Select>
      </div>
    </div>

    <!-- Current Chain Info -->
    {#if currentChainConfig}
      <div class="mb-8 text-center">
        <p class="text-lg theme-text-secondary">
          Connected to: <span class="font-semibold theme-text">{currentChainConfig.name}</span>
        </p>
        <p class="text-sm theme-text-secondary">
          Native Token: {currentChainConfig.nativeCurrency.name} ({currentChainConfig.nativeCurrency.symbol})
        </p>
      </div>
    {/if}

    <!-- Markets Grid -->
    <div class="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {#each markets as market}
        <Card 
          href={isMarketDeployed(market.id) ? getMarketUrl(market.id) : undefined}
          class="flex flex-col items-center justify-center p-6 text-center theme-card theme-border shadow-lg transition-all duration-200 {isMarketDeployed(market.id) ? 'hover:opacity-90 hover:scale-105 cursor-pointer' : 'opacity-50 cursor-not-allowed'}"
        >
          <h5 class="mb-2 text-2xl font-bold tracking-tight theme-text">
            {market.name}
          </h5>
          <p class="font-normal theme-text-secondary mb-4">
            {market.description}
          </p>
          
          <!-- Market Status -->
          <div class="w-full">
            {#if isMarketDeployed(market.id)}
              <div class="flex items-center justify-center space-x-2">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="text-sm theme-text-secondary">Available</span>
              </div>
            {:else}
              <div class="flex items-center justify-center space-x-2">
                <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                <span class="text-sm theme-text-secondary">Not Deployed</span>
              </div>
              <p class="text-xs theme-text-secondary mt-1">
                Contract not deployed on this chain
              </p>
            {/if}
          </div>
        </Card>
      {/each}
    </div>

    <!-- No Markets Available -->
    {#if markets.length === 0}
      <div class="text-center py-12">
        <p class="text-lg theme-text-secondary mb-4">
          No markets are configured for {currentChainConfig?.name || 'this chain'}.
        </p>
        <p class="text-sm theme-text-secondary">
          Please check the configuration or try a different chain.
        </p>
      </div>
    {/if}

    <!-- Chain Information -->
    <div class="mt-12 text-center">
      <h3 class="text-xl font-semibold theme-text mb-4">Supported Chains</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {#each chains as chain}
          <div class="p-4 rounded-lg theme-card theme-border">
            <h4 class="font-semibold theme-text">{chain.name}</h4>
            <p class="text-sm theme-text-secondary">
              {getAvailableMarkets(chain.id).filter(m => m.enabled).length} markets available
            </p>
            <p class="text-xs theme-text-secondary">
              {chain.nativeCurrency.symbol}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
