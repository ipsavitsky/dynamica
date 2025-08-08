<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { currentChainId } from "$lib/chainManager";
  import { MarketService } from "$lib/services/market-service.svelte";

  let TradePanel: any = $state(null);
  let UserHoldings: any = $state(null);
  let TransactionConfirmationModal: any = $state(null);
  let MarketNotResolvedModal: any = $state(null);
  let BarChartSection: any = $state(null);
  let LineChartSection: any = $state(null);

  const { dataset } = page.params;
  const marketService = new MarketService(dataset!, currentChainId);

  onMount(async () => {
    await marketService.loadMarketData();
    TradePanel = (await import("$lib/components/market/trade-panel.svelte"))
      .default;
    UserHoldings = (await import("$lib/components/market/user-holdings.svelte"))
      .default;
    TransactionConfirmationModal = (
      await import(
        "$lib/components/market/transaction-confirmation-modal.svelte"
      )
    ).default;
    MarketNotResolvedModal = (
      await import("$lib/components/market/market-not-resolved-modal.svelte")
    ).default;
    BarChartSection = (
      await import("$lib/components/market/bar-chart-section.svelte")
    ).default;
    LineChartSection = (
      await import("$lib/components/market/line-chart-section.svelte")
    ).default;
  });

  // Debounce helper and reactive effect to update price on amount/selection changes
  let _debounceHandle: ReturnType<typeof setTimeout> | null = null;
  const debounce = (fn: () => void, delay = 250) => {
    if (_debounceHandle) clearTimeout(_debounceHandle);
    _debounceHandle = setTimeout(fn, delay);
  };

  $effect(() => {
    const ready =
      !!marketService.contractAddress &&
      Array.isArray(marketService.assetNames) &&
      marketService.assetNames.length > 0 &&
      typeof marketService.decimals === "number" &&
      marketService.selectedAsset !== "" &&
      marketService.amount != null &&
      Number(marketService.amount) > 0;

    if (!ready) return;

    const assetIndex = marketService.assetNames.indexOf(
      marketService.selectedAsset,
    );
    if (assetIndex < 0) return;

    debounce(() => {
      marketService.getContractPrice();
    }, 250);
  });
</script>

<div class="theme-surface min-h-screen p-4 md:p-8">
  <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start md:gap-8">
    {#if BarChartSection}
      <BarChartSection
        loading={marketService.loading}
        error={marketService.error}
        assetNames={marketService.assetNames}
        currentAllocationData={marketService.currentAllocationData}
        marginalPrices={marketService.marginalPrices}
      />
    {/if}
    {#if TradePanel}
      <TradePanel
        bind:selectedAsset={marketService.selectedAsset}
        bind:amount={marketService.amount}
        price={marketService.price}
        pricePerShare={marketService.pricePerShare}
        isInvalid={marketService.isInvalid}
        isBuying={marketService.isBuying}
        isSelling={marketService.isSelling}
        isRedeeming={marketService.isRedeeming}
        assetNames={marketService.assetNames}
        contractAddress={marketService.contractAddress}
        handleBuy={() => marketService.handleBuy()}
        handleSell={() => marketService.handleSell()}
        handleRedeem={() => marketService.handleRedeem()}
        decrement={() => marketService.decrement()}
        increment={() => marketService.increment()}
        getContractPrice={() => marketService.getContractPrice()}
      />
    {/if}
  </div>

  {#if LineChartSection}
    <LineChartSection
      loading={marketService.loading}
      error={marketService.error}
      assetNames={marketService.assetNames}
      dataDates={marketService.dataDates}
      dataRows={marketService.dataRows}
    />
  {/if}

  {#if UserHoldings}
    <UserHoldings
      userShares={marketService.userShares}
      assetNames={marketService.assetNames}
      currentAllocationData={marketService.currentAllocationData}
      marginalPrices={marketService.marginalPrices}
    />
  {/if}

  {#if TransactionConfirmationModal}
    <TransactionConfirmationModal
      bind:showConfirmation={marketService.showConfirmation}
      pendingTransaction={marketService.pendingTransaction}
      transactionCost={marketService.transactionCost}
      amount={marketService.amount}
      selectedAsset={marketService.selectedAsset}
      isBuying={marketService.isBuying}
      isSelling={marketService.isSelling}
      isApproving={marketService.isApproving}
      confirmTransaction={() => marketService.confirmTransaction()}
    />
  {/if}

  {#if MarketNotResolvedModal}
    <MarketNotResolvedModal
      bind:showMarketNotResolved={marketService.showMarketNotResolved}
    />
  {/if}
</div>

<style>
  /* Hide spinner buttons from number input */
  :global(input[type="number"]::-webkit-inner-spin-button),
  :global(input[type="number"]::-webkit-outer-spin-button) {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
  }
  :global(input[type="number"]) {
    -moz-appearance: textfield;
    appearance: textfield;
  }
</style>
