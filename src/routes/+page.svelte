<script lang="ts">
  import * as Card from "$lib/components/ui/card/index";
  import { currentChainId, availableCurrentMarkets } from "$lib/chainManager";
  import { isMarketAvailable } from "$lib/config/index";

  const getMarketUrl = (marketId: string) => `/market/${marketId}`;

  const isMarketDeployed = (marketId: string) =>
    isMarketAvailable(currentChainId, marketId);
</script>

<div class="theme-surface min-h-screen transition-colors duration-300">
  <div class="container mx-auto p-8">
    <h1 class="mb-8 text-center text-4xl font-bold">Available markets</h1>
    <div
      class="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
    >
      {#each availableCurrentMarkets as market}
        <a
          href={isMarketDeployed(market.id)
            ? getMarketUrl(market.id)
            : undefined}
          class="theme-card theme-border flex flex-col items-center justify-center p-6 text-center shadow-lg transition-all duration-200 {isMarketDeployed(
            market.id,
          )
            ? 'cursor-pointer hover:scale-105 hover:opacity-90'
            : 'cursor-not-allowed opacity-50'}"
        >
          <Card.Root>
            <Card.Header>
              <Card.Title>{market.name}</Card.Title>
            </Card.Header>
            <Card.Content>
              <p class="theme-text-secondary mb-4 font-normal">
                {market.description}
              </p>
            </Card.Content>
          </Card.Root>
        </a>
      {/each}
    </div>
  </div>
</div>
