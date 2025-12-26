<script lang="ts">
  import ChartColumnBig from "@lucide/svelte/icons/chart-column-big";

  export let userShares: number[];
  export let assetNames: string[];
  export let currentAllocationData: number[];
  export let marginalPrices: number[];
</script>

<div
  class="theme-card theme-border col-span-3 mt-4 rounded-lg p-4 shadow-lg transition-opacity hover:opacity-90 md:p-6"
>
  <div class="mb-6">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h3 class="theme-text text-lg font-semibold">Your Holdings</h3>
        <p class="theme-text-secondary text-sm">
          Current share positions across all assets
        </p>
      </div>
      {#if userShares.some((share) => share > 0)}
        <div class="text-right">
          <div class="text-2xl font-bold">
            {userShares
              .reduce(
                (total, shares, index) =>
                  total + shares * (currentAllocationData[index] || 0),
                0,
              )
              .toFixed(4)}
          </div>
          <p class="text-sm">Total Estimated Payout</p>
        </div>
      {/if}
    </div>
  </div>

  {#if userShares.some((share) => share > 0)}
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each assetNames as assetName, index}
        {#if userShares[index] > 0}
          <div class="rounded-lg border">
            <div class="mb-3 flex items-center justify-between">
              <h4 class="font-medium">
                {assetName}
              </h4>
            </div>

            <!-- Shares Owned -->
            <div class="mb-3">
              <div class="flex items-center justify-between">
                <span class="text-sm"> Shares Owned: </span>
                <span class="text-xl font-bold">
                  {userShares[index].toFixed(3)}
                </span>
              </div>
            </div>

            <!-- Current Variable Distribution -->
            {#if currentAllocationData[index] !== undefined}
              <div class="mb-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm"> Current Distribution: </span>
                  <span class="text-lg font-semibold">
                    {(currentAllocationData[index] * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <!-- Estimated Instant Payout -->
              <div class="border-t">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium"> Estimated Payout: </span>
                  <span class="text-lg font-bold">
                    {(userShares[index] * currentAllocationData[index]).toFixed(
                      4,
                    )}
                  </span>
                </div>
                <p class="mt-1 text-xs">(shares × distribution)</p>
              </div>
            {/if}

            <!-- Current Price -->
            {#if marginalPrices[index] > 0}
              <div class="mt-2 border-t">
                <p class="text-xs">
                  Current price: {marginalPrices[index].toFixed(4)}
                </p>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <div class="py-8 text-center">
      <ChartColumnBig class="mx-auto mb-4 h-12 w-12 opacity-50" />
      <p class="text-lg font-medium">No holdings yet</p>
      <p class="text-sm">Buy some shares to see your positions here</p>
    </div>
  {/if}
</div>
