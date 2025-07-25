<script lang="ts">
  import { Card, Select } from "flowbite-svelte";
  import {
    currentChainId,
    currentChain,
    availableCurrentMarkets,
    availableChains,
    switchChain,
  } from "$lib/chainManager";
  import { isMarketAvailable, getAvailableMarkets } from "$lib/config/index";
  import { switchWalletNetwork } from "$lib/appkit";
  import { get } from "svelte/store";

  let selectedChainId = $state(get(currentChainId));
  let markets = $state(get(availableCurrentMarkets));
  let chains = $state(get(availableChains));
  let currentChainConfig = $state(get(currentChain));

  $effect(() => {
    selectedChainId = get(currentChainId);
    markets = get(availableCurrentMarkets);
    chains = get(availableChains);
    currentChainConfig = get(currentChain);
  });

  const handleChainChange = async (event: Event) => {
    const newChainId = parseInt((event.target as HTMLSelectElement).value);
    if (switchChain(newChainId)) {
      selectedChainId = newChainId;
      try {
        await switchWalletNetwork(newChainId);
      } catch {}
    }
  };

  const getMarketUrl = (marketId: string) => `/market/${marketId}`;

  const isMarketDeployed = $derived((marketId: string) =>
    isMarketAvailable(selectedChainId, marketId),
  );
</script>

<div class="theme-surface min-h-screen transition-colors duration-300">
  <div class="container mx-auto p-8">
    <h1 class="theme-text mb-8 text-center text-4xl font-bold">
      Select a Market
    </h1>

    <!-- Chain Selector -->
    <div class="mb-8 flex justify-center">
      <div class="w-full max-w-md">
        <label
          for="chain-select"
          class="theme-text mb-2 block text-sm font-medium"
        >
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
        <p class="theme-text-secondary text-lg">
          Connected to: <span class="theme-text font-semibold"
            >{currentChainConfig.name}</span
          >
        </p>
        <p class="theme-text-secondary text-sm">
          Native Token: {currentChainConfig.nativeCurrency.name} ({currentChainConfig
            .nativeCurrency.symbol})
        </p>
      </div>
    {/if}

    <!-- Markets Grid -->
    <div
      class="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
    >
      {#each markets as market}
        <Card
          href={isMarketDeployed(market.id)
            ? getMarketUrl(market.id)
            : undefined}
          class="theme-card theme-border flex flex-col items-center justify-center p-6 text-center shadow-lg transition-all duration-200 {isMarketDeployed(
            market.id,
          )
            ? 'cursor-pointer hover:scale-105 hover:opacity-90'
            : 'cursor-not-allowed opacity-50'}"
        >
          <h5 class="theme-text mb-2 text-2xl font-bold tracking-tight">
            {market.name}
          </h5>
          <p class="theme-text-secondary mb-4 font-normal">
            {market.description}
          </p>

          <!-- Market Status -->
          <div class="w-full">
            {#if isMarketDeployed(market.id)}
              <div class="flex items-center justify-center space-x-2">
                <div class="h-2 w-2 rounded-full bg-green-500"></div>
                <span class="theme-text-secondary text-sm">Available</span>
              </div>
            {:else}
              <div class="flex items-center justify-center space-x-2">
                <div class="h-2 w-2 rounded-full bg-red-500"></div>
                <span class="theme-text-secondary text-sm">Not Deployed</span>
              </div>
              <p class="theme-text-secondary mt-1 text-xs">
                Contract not deployed on this chain
              </p>
            {/if}
          </div>
        </Card>
      {/each}
    </div>

    <!-- No Markets Available -->
    {#if markets.length === 0}
      <div class="py-12 text-center">
        <p class="theme-text-secondary mb-4 text-lg">
          No markets are configured for {currentChainConfig?.name ||
            "this chain"}.
        </p>
        <p class="theme-text-secondary text-sm">
          Please check the configuration or try a different chain.
        </p>
      </div>
    {/if}

    <!-- Chain Information -->
    <div class="mt-12 text-center">
      <h3 class="theme-text mb-4 text-xl font-semibold">Supported Chains</h3>
      <div class="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
        {#each chains as chain}
          <div class="theme-card theme-border rounded-lg p-4">
            <h4 class="theme-text font-semibold">{chain.name}</h4>
            <p class="theme-text-secondary text-sm">
              {getAvailableMarkets(chain.id).filter((m) => m.enabled).length} markets
              available
            </p>
            <p class="theme-text-secondary text-xs">
              {chain.nativeCurrency.symbol}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
