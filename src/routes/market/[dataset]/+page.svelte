<script lang="ts">
  import { onMount } from "svelte";
  import * as Card from "$lib/components/ui/card/index";
  import * as Dialog from "$lib/components/ui/dialog/index";
  import { Button } from "$lib/components/ui/button/index";
  import { Input } from "$lib/components/ui/input/index";
  import { Alert } from "$lib/components/ui/alert/index";
  import { Label } from "$lib/components/ui/label/index";
  import * as Select from "$lib/components/ui/select/index";
  import * as Chart from "$lib/components/ui/chart/index";
  import { BarChart, LineChart } from "layerchart";
  import { scaleBand } from "d3-scale";
  import { ethers } from "ethers";
  import { page } from "$app/state";
  import { dataService, type DataPoint } from "$lib/api";
  import { contractABI } from "$lib/abi";
  import {
    buyShares,
    sellShares,
    redeemPayout,
    checkAllowance,
    approveTokens,
    getTransactionCost,
    getTokenBalance,
    getChainProvider,
  } from "$lib/blockchain";
  import { initializeAppKit } from "$lib/appkit";
  import { browser } from "$app/environment";
  import { getChartColor } from "$lib/theme";
  import { getMarketAddress, getMarketConfig, getChainConfig } from "$lib/config/index";
  import { currentChainId, currentChain } from "$lib/chainManager";
  import ChartColumnBig from "@lucide/svelte/icons/chart-column-big";

  const { dataset } = page.params;
  let contractAddress = getMarketAddress(currentChainId, dataset!);
  let marketConfig = getMarketConfig(currentChainId, dataset!);
  let chainConfig = getChainConfig(currentChainId);

  let assetNames = $state<string[]>([]);
  let dataRows = $state<number[][]>([]);
  let dataDates = $state<Date[]>([]);
  let currentAllocationData = $state<number[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let marginalPrices = $state<number[]>([]);
  let userShares = $state<number[]>([]);
  let selectedAsset = $state("");
  let amount = $state(1);
  let contractDecimals = $state(10);
  let tokenDecimals = $state(18);
  let combinedMode = $state(false);
  let isBuying = $state(false);
  let isSelling = $state(false);
  let isRedeeming = $state(false);
  let isApproving = $state(false);
  let transactionCost = $state<string | null>(null);
  let showConfirmation = $state(false);
  let pendingTransaction = $state<"buy" | "sell" | null>(null);
  let showMarketNotResolved = $state(false);

  const appKit = browser ? initializeAppKit() : null;
  const selectItems = $derived(
    assetNames.map((name) => ({ name, value: name })),
  );
  const isInvalid = $derived(amount <= 0);
  let price = $state("...");
  const pricePerShare = $derived(
    !isInvalid && price !== "..." && price !== "Error"
      ? (parseFloat(price) / amount).toFixed(2)
      : "0.00",
  );

  const getProvider = () => window.ethereum || appKit?.getProvider?.("eip155");

  const getContractPrice = async () => {
    if (isInvalid || !contractAddress) {
      return isInvalid ? "0.00" : "Error";
    }
    try {
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        getChainProvider(currentChainId),
      );
      const outcomeSlotCount = await contract.outcomeSlotCount();
      const deltaOutcomeAmounts = new Array(Number(outcomeSlotCount)).fill(0);
      const assetIndex = assetNames.indexOf(selectedAsset);
      if (assetIndex !== -1)
        deltaOutcomeAmounts[assetIndex] = ethers.parseUnits(
          amount.toString(),
          contractDecimals,
        );
      const netCost = await contract.calcNetCost(deltaOutcomeAmounts);
      price = Math.abs(
        parseFloat(ethers.formatUnits(netCost, tokenDecimals)),
      ).toFixed(2);
    } catch (error) {
      console.error("Error fetching price from contract:", error);
      price = "Error";
    }
  };

  const getMarginalPrices = async () => {
    if (!contractAddress) return;
    try {
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        getChainProvider(currentChainId),
      );
      const prices = await Promise.all(
        assetNames.map((_, i) => contract.calcMarginalPrice(i)),
      );
      marginalPrices = prices.map((p) =>
        parseFloat(ethers.formatUnits(p, tokenDecimals)),
      );
    } catch (error) {
      console.error("Error fetching marginal prices:", error);
    }
  };

  const getUserShares = async () => {
    if (!appKit || !contractAddress) {
      userShares = new Array(assetNames.length).fill(0);
      return;
    }
    try {
      const caipAddress = appKit.getCaipAddress();
      if (!caipAddress) {
        userShares = new Array(assetNames.length).fill(0);
        return;
      }
      const userAddress = caipAddress.split(":")[2];
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        getChainProvider(currentChainId),
      );
      const shares = await Promise.all(
        assetNames.map((_, i) =>
          contract.balanceOf(userAddress, contract.shareId(1, 1, i)),
        ),
      );
      userShares = shares.map((share) =>
        parseFloat(ethers.formatUnits(share, contractDecimals)),
      );
    } catch (error) {
      console.error("Error fetching user shares:", error);
      userShares = new Array(assetNames.length).fill(0);
    }
  };

  const loadMarketData = async () => {
    try {
      loading = true;
      error = null;
      if (!marketConfig?.enabled)
        throw new Error(
          `Market "${dataset}" is not available on ${currentChain?.name || "this chain"}.`,
        );

      const data =
        dataset === "drivers"
          ? await dataService.getDriverData()
          : await dataService.getCryptoData();
      assetNames = data.headers;
      dataRows = data.rows;
      dataDates = data.dates || [];
      marginalPrices = new Array(assetNames.length).fill(0);
      userShares = new Array(assetNames.length).fill(0);
      if (data.rows.length > 0)
        currentAllocationData = data.rows[data.rows.length - 1];
      selectedAsset = assetNames[0] || "";

      if (contractAddress) {
        const contract = new ethers.Contract(
          contractAddress,
          contractABI,
          getChainProvider(currentChainId),
        );
        const tokenContract = new ethers.Contract(
          chainConfig?.baseTokenAddress || "",
          contractABI,
          getChainProvider(currentChainId),
        );
        contractDecimals = await contract.decimals();
        tokenDecimals = await tokenContract.decimals();
        await Promise.all([
          getContractPrice(),
          getMarginalPrices(),
          getUserShares(),
        ]);
      }
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  };

  const handleTransaction = async (type: "buy" | "sell") => {
    if (!appKit || isInvalid || !contractAddress) return;
    try {
      const provider = getProvider();
      if (!provider) return;
      const ethersProvider = new ethers.BrowserProvider(provider);
      const assetIndex = assetNames.indexOf(selectedAsset);
      if (assetIndex === -1) return;
      const cost = await getTransactionCost(
        currentChainId,
        assetIndex,
        amount.toString(),
        ethersProvider,
        contractAddress,
      );
      if (cost) {
        transactionCost = cost.cost;
        pendingTransaction = type;
        showConfirmation = true;
      }
    } catch (error) {
      console.error("Error calculating transaction cost:", error);
    }
  };

  const confirmTransaction = async () => {
    if (!pendingTransaction || !transactionCost || !contractAddress) return;
    const caipAddress = appKit?.getCaipAddress();
    if (!caipAddress) return;
    const address = caipAddress.split(":")[2];

    try {
      const provider = getProvider();
      if (!provider) return;
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      const allowanceInfo = await checkAllowance(
        address,
        ethersProvider,
        contractAddress,
        currentChainId,
      );
      if (!allowanceInfo) return;

      const requiredAmount = parseFloat(transactionCost);
      const currentAllowance = parseFloat(allowanceInfo.allowance);

      if (currentAllowance < requiredAmount) {
        isApproving = true;
        const approvalSuccess = await approveTokens(
          address,
          (requiredAmount * 2).toString(),
          signer,
          contractAddress,
          currentChainId,
        );
        isApproving = false;
        if (!approvalSuccess) return;
      }

      const assetIndex = assetNames.indexOf(selectedAsset);
      let success = false;

      if (pendingTransaction === "buy") {
        isBuying = true;
        success = await buyShares(
          assetIndex,
          amount.toString(),
          signer,
          contractAddress,
        );
        isBuying = false;
      } else {
        isSelling = true;
        success = await sellShares(
          assetIndex,
          amount.toString(),
          signer,
          contractAddress,
        );
        isSelling = false;
      }

      if (success)
        await Promise.all([
          getContractPrice(),
          getMarginalPrices(),
          getUserShares(),
        ]);
    } catch (error) {
      console.error(`Error during ${pendingTransaction}:`, error);
    } finally {
      showConfirmation = false;
      pendingTransaction = null;
      transactionCost = null;
      isBuying = false;
      isSelling = false;
      isApproving = false;
    }
  };

  const handleRedeem = async () => {
    if (!appKit || isRedeeming || !contractAddress) return;
    isRedeeming = true;
    try {
      const caipAddress = appKit.getCaipAddress();
      if (!caipAddress) {
        await appKit.open();
        return;
      }
      const provider = getProvider();
      if (!provider) return;
      const signer = await new ethers.BrowserProvider(provider).getSigner();
      const success = await redeemPayout(signer, contractAddress);
      if (success)
        await Promise.all([
          getContractPrice(),
          getMarginalPrices(),
          getUserShares(),
        ]);
      else showMarketNotResolved = true;
    } catch (error) {
      console.error("Error during redeem:", error);
      showMarketNotResolved = true;
    } finally {
      isRedeeming = false;
    }
  };

  const decrement = () => {
    if (amount > 1) amount -= 1;
    // Trigger immediate re-quote after decrement
    immediateDebounce(() => {
      getContractPrice();
    }, 0);
  };

  const increment = () => {
    amount += 1;
    // Trigger immediate re-quote after increment
    immediateDebounce(() => {
      getContractPrice();
    }, 0);
  };

  const handleBuy = async () => {
    await handleTransaction("buy");
  };

  const handleSell = async () => {
    await handleTransaction("sell");
  };

  onMount(loadMarketData);

  // Immediate debounce helper for direct UI actions
  let _immediateDebounce: ReturnType<typeof setTimeout> | null = null;
  const immediateDebounce = (fn: () => void, delay = 200) => {
    if (_immediateDebounce) clearTimeout(_immediateDebounce);
    _immediateDebounce = setTimeout(fn, delay);
  };

  // Debounce helper and reactive effect to update price on amount/selection changes
  let _debounceHandle: ReturnType<typeof setTimeout> | null = null;
  const debounce = (fn: () => void, delay = 250) => {
    if (_debounceHandle) clearTimeout(_debounceHandle);
    _debounceHandle = setTimeout(fn, delay);
  };

  $effect(() => {
    // Only run when we have enough context to compute a quote
    const ready =
      !!contractAddress &&
      Array.isArray(assetNames) &&
      assetNames.length > 0 &&
      typeof contractDecimals === "number" &&
      typeof tokenDecimals === "number" &&
      selectedAsset !== "" &&
      amount != null &&
      Number(amount) > 0;

    if (!ready) return;

    const assetIndex = assetNames.indexOf(selectedAsset);
    if (assetIndex < 0) return;

    debounce(() => {
      // getContractPrice updates the `price` state internally
      getContractPrice();
    }, 250);
  });

  const barChartConfig = {
    percentage: {
      label: "Current percentage",
      color: "var(--bar-chart-1)",
    },
    marginal: {
      label: "Margin price",
      color: "var(--bar-chart-2)",
    },
  } satisfies Chart.ChartConfig;

  const barChartData = $derived(
    assetNames.map((name, i) => ({
      name: name,
      percentage: currentAllocationData[i],
      marginal: marginalPrices[i],
    })),
  );

  const lineChartConfig: Chart.ChartConfig = $derived(
    Object.fromEntries(
      assetNames.map((name, i) => [
        name,
        {
          label: name,
          color: getChartColor(i),
        },
      ]),
    ),
  );

  const lineChartData = $derived(
    dataDates.map((date, dateIndex) => {
      const entry: Record<string, any> = { date };
      assetNames.forEach((assetName, assetIndex) => {
        entry[assetName] = dataRows[dateIndex][assetIndex];
      });
      return entry;
    }),
  );
</script>

<div class="theme-surface grid min-h-screen grid-cols-3 items-start gap-8 p-8">
  <!-- loading or error or chart -->
  <div class="col-span-2">
    {#if loading}
      <p class="theme-text">Loading chart...</p>
    {:else if error}
      <Alert color="red">{error}</Alert>
    {:else}
      <Chart.Container class="h-[400px] w-full" config={barChartConfig}>
        <BarChart
          data={barChartData}
          xScale={scaleBand().padding(0.25)}
          x="name"
          axis="x"
          seriesLayout="group"
          series={[
            {
              key: "percentage",
              label: barChartConfig.percentage.label,
              color: barChartConfig.percentage.color,
            },
            {
              key: "marginal",
              label: barChartConfig.marginal.label,
              color: barChartConfig.marginal.color,
            },
          ]}
        >
          {#snippet tooltip()}
            <Chart.Tooltip />
          {/snippet}
        </BarChart>
      </Chart.Container>
    {/if}
  </div>
  <Card.Root
    class="theme-card theme-border h-full p-6 shadow-lg transition-opacity hover:opacity-90"
  >
    <Card.Content>
      <form class="flex h-full flex-col justify-center">
        <div class="mb-4 flex items-end justify-start gap-4">
          <p class="theme-text text-4xl font-semibold">
            ${price}
          </p>
          <div class="text-s theme-text-secondary font-normal">
            <p>
              ${pricePerShare}
            </p>
            <p>per share</p>
          </div>
        </div>
        <div class="theme-text mb-4 space-y-2">
          <Label for="assetSelection">Assets</Label>
          <div id="assetSelection">
            <Select.Root type="single" bind:value={selectedAsset}>
              <Select.Trigger
                class="theme-card theme-border theme-text w-full text-left"
              >
                {selectedAsset !== undefined ? selectedAsset : "Select Outcome"}
              </Select.Trigger>
              <Select.Content>
                {#each selectItems as item}
                  <Select.Item value={item.value}>{item.name}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
        </div>
        <div class="theme-text mb-4 space-y-2">
          <Label for="amountInput">Shares</Label>
          <div id="amountInput" class="flex w-full items-center space-x-2">
            <Input
              bind:value={amount}
              type="number"
              name="amount"
              required
              oninput={() => {
                if (!contractAddress) return;
                if (!selectedAsset) return;
                if (amount == null || Number(amount) <= 0) return;
                immediateDebounce(() => {
                  getContractPrice(); // updates price based on current amount
                }, 200);
              }}
            />
            <Button onclick={decrement} type="button" color="light">-1</Button>
            <Button onclick={increment} type="button" color="light">+1</Button>
          </div>
          {#if isInvalid}
            <Alert>Share amount must be a positive number.</Alert>
          {/if}
        </div>
        <div class="mb-4 grid grid-cols-2 gap-4">
          <Button
            onclick={handleBuy}
            size="lg"
            class="w-full"
            disabled={isInvalid || isBuying}
            >{isBuying ? "Buying..." : "Buy"}</Button
          >
          <Button
            onclick={handleSell}
            size="lg"
            class="w-full"
            disabled={isInvalid || isSelling}
            >{isSelling ? "Selling..." : "Sell"}</Button
          >
        </div>
        <Button
          onclick={handleRedeem}
          size="lg"
          class="w-full"
          disabled={isRedeeming}
          >{isRedeeming ? "Redeeming..." : "Redeem"}</Button
        >
      </form>
    </Card.Content>
  </Card.Root>
  <div
    class="theme-card theme-border col-span-3 rounded-lg p-4 shadow-lg transition-opacity hover:opacity-90 md:p-6"
  >
    <div class="mb-4 flex items-center justify-between">
      <h3 class="theme-text text-lg font-semibold">Historical Data</h3>
      <Button
        class="theme-btn-primary"
        size="sm"
        onclick={() => (combinedMode = !combinedMode)}
      >
        {combinedMode ? "Separate Charts" : "Combined Chart"}
      </Button>
    </div>
    {#if loading}
      <p class="theme-text">Loading chart...</p>
    {:else if error}
      <Alert color="red">{error}</Alert>
    {:else if combinedMode}
      <Chart.Container class="h-[300px] w-full" config={lineChartConfig}>
        <LineChart
          data={lineChartData}
          x="date"
          yDomain={null}
          series={assetNames.map((n) => ({
            key: n,
            color: lineChartConfig[n].color,
          }))}
        >
          {#snippet tooltip()}
            <Chart.Tooltip />
          {/snippet}
        </LineChart>
      </Chart.Container>
    {:else}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        {#each assetNames as asset}
          <div
            class="theme-border theme-card rounded-lg p-4 shadow-md transition-opacity hover:opacity-90"
          >
            <Chart.Container class="h-[300px] w-full" config={lineChartConfig}>
              <LineChart
                data={lineChartData}
                x="date"
                yDomain={null}
                series={[{ key: asset, color: lineChartConfig[asset].color }]}
              >
                {#snippet tooltip()}
                  <Chart.Tooltip />
                {/snippet}
              </LineChart>
            </Chart.Container>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- User Holdings Section -->
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
                      {(
                        userShares[index] * currentAllocationData[index]
                      ).toFixed(4)}
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
</div>

<!-- Transaction Confirmation Modal -->
<Dialog.Root bind:open={showConfirmation}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Confirm Transaction</Dialog.Title>
      {#if pendingTransaction && transactionCost}
        <Dialog.Description>
          <div class="space-y-4">
            <div class="text-center">
              <h3 class="text-lg font-semibold">
                {pendingTransaction === "buy" ? "Buy" : "Sell"}
                {amount} shares of {selectedAsset}
              </h3>
              <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                Cost: {transactionCost} tokens
              </p>
            </div>

            <div class="rounded-lg">
              <p class="text-sm">
                This transaction will require token approval if you haven't
                approved enough tokens yet. You may see two transactions: one
                for approval and one for the trade.
              </p>
            </div>
          </div>
        </Dialog.Description>
      {/if}
    </Dialog.Header>
    <Dialog.Footer>
      <Button
        onclick={confirmTransaction}
        disabled={isBuying || isSelling || isApproving}
        color="green"
        class="flex-1"
      >
        {#if isApproving}
          Approving...
        {:else if isBuying}
          Buying...
        {:else if isSelling}
          Selling...
        {:else}
          Confirm
        {/if}
      </Button>
      <Button
        onclick={() => (showConfirmation = false)}
        color="alternative"
        class="flex-1"
        disabled={isBuying || isSelling || isApproving}
      >
        Cancel
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Market Not Resolved Modal -->
<Dialog.Root bind:open={showMarketNotResolved}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Market Not Resolved</Dialog.Title>
      <Dialog.Description>
        <div class="space-y-6">
          <div class="text-center">
            <p class="text-sm">
              The market for this dataset on the current chain is not yet
              resolved.
            </p>
          </div>

          <div class="rounded-lg">
            <div class="flex">
              <div class="ml-3">
                <h3 class="text-sm font-medium">What this means:</h3>
                <div class="mt-2 text-sm">
                  <ul class="list-inside list-disc space-y-1">
                    <li>The market outcome has not been determined yet</li>
                    <li>You may need to wait for the market to resolve</li>
                    <li>Ensure you're on the correct chain</li>
                    <li>Check if the market contract is properly deployed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button
        onclick={() => (showMarketNotResolved = false)}
        color="alternative"
        size="sm"
      >
        Close
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

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
