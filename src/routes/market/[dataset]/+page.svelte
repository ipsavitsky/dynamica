<script lang="ts">
    import { onMount } from "svelte";
    import type { ApexOptions } from "apexcharts";
    import { Chart } from "@flowbite-svelte-plugins/chart";
    import { Card, Button, Label, Input, Alert, Select, Modal } from "flowbite-svelte";
    import { ethers } from "ethers";
    import { page } from "$app/stores";
    import { dataService, type DataPoint } from "$lib/api";
    import { contractABI } from "$lib/abi";
    import { buyShares, sellShares, redeemPayout, checkAllowance, approveTokens, getTransactionCost, getTokenBalance, getChainProvider } from "$lib/utils";
    import { initializeAppKit } from "$lib/appkit";
    import { browser } from "$app/environment";
    import { getChartColors } from "$lib/theme";
    import { getMarketAddress, getMarketConfig } from "$lib/config/index";
    import { currentChainId, currentChain } from "$lib/chainManager";
    import { get } from "svelte/store";

    const { dataset } = $page.params;
    let chainId = $state(get(currentChainId));
    let currentChainConfig = $state(get(currentChain));
    let contractAddress = $derived(getMarketAddress(chainId, dataset));
    let marketConfig = $derived(getMarketConfig(chainId, dataset));

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
    let decimals = $state(18);
    let combinedMode = $state(false);
    let isDarkMode = $state(false);
    let isBuying = $state(false);
    let isSelling = $state(false);
    let isRedeeming = $state(false);
    let isApproving = $state(false);
    let transactionCost = $state<string | null>(null);
    let showConfirmation = $state(false);
    let pendingTransaction = $state<'buy' | 'sell' | null>(null);
    let showMarketNotResolved = $state(false);

    const appKit = browser ? initializeAppKit() : null;
    const selectItems = $derived(assetNames.map((name) => ({ name, value: name })));
    const isInvalid = $derived(amount <= 0);
    let price = $state("...");
    const pricePerShare = $derived(!isInvalid && price !== "..." && price !== "Error" ? (parseFloat(price) / amount).toFixed(2) : "0.00");

    const getProvider = () => window.ethereum || appKit?.getProvider?.('eip155');

    const getContractPrice = async () => {
        if (isInvalid || !contractAddress) { price = isInvalid ? "0.00" : "Error"; return; }
        try {
            const contract = new ethers.Contract(contractAddress, contractABI, getChainProvider(chainId));
            const outcomeSlotCount = await contract.outcomeSlotCount();
            const deltaOutcomeAmounts = new Array(Number(outcomeSlotCount)).fill(0);
            const assetIndex = assetNames.indexOf(selectedAsset);
            if (assetIndex !== -1) deltaOutcomeAmounts[assetIndex] = ethers.parseUnits(amount.toString(), decimals);
            const netCost = await contract.calcNetCost(deltaOutcomeAmounts);
            price = Math.abs(parseFloat(ethers.formatUnits(netCost, decimals))).toFixed(2);
        } catch (error) {
            console.error("Error fetching price from contract:", error);
            price = "Error";
        }
    };

    const getMarginalPrices = async () => {
        if (!contractAddress) return;
        try {
            const contract = new ethers.Contract(contractAddress, contractABI, getChainProvider(chainId));
            const prices = await Promise.all(assetNames.map((_, i) => contract.calcMarginalPrice(i)));
            marginalPrices = prices.map(p => parseFloat(ethers.formatUnits(p, decimals)));
        } catch (error) {
            console.error("Error fetching marginal prices:", error);
        }
    };

    const getUserShares = async () => {
        if (!appKit || !contractAddress) { userShares = new Array(assetNames.length).fill(0); return; }
        try {
            const caipAddress = appKit.getCaipAddress();
            if (!caipAddress) { userShares = new Array(assetNames.length).fill(0); return; }
            const userAddress = caipAddress.split(':')[2];
            const contract = new ethers.Contract(contractAddress, contractABI, getChainProvider(chainId));
            const shares = await Promise.all(assetNames.map((_, i) => contract.userShares(userAddress, i)));
            userShares = shares.map(share => parseFloat(ethers.formatUnits(share, decimals)));
        } catch (error) {
            console.error("Error fetching user shares:", error);
            userShares = new Array(assetNames.length).fill(0);
        }
    };

    const loadMarketData = async () => {
        try {
            loading = true;
            error = null;
            if (!marketConfig?.enabled) throw new Error(`Market "${dataset}" is not available on ${currentChainConfig?.name || 'this chain'}.`);
            
            const data = dataset === 'drivers' ? await dataService.getDriverData() : await dataService.getCryptoData();
            assetNames = data.headers;
            dataRows = data.rows;
            dataDates = data.dates || [];
            marginalPrices = new Array(assetNames.length).fill(0);
            userShares = new Array(assetNames.length).fill(0);
            if (data.rows.length > 0) currentAllocationData = data.rows[data.rows.length - 1];
            selectedAsset = assetNames[0] || "";
            isDarkMode = document.documentElement.classList.contains('dark');

            if (contractAddress) {
                const contract = new ethers.Contract(contractAddress, contractABI, getChainProvider(chainId));
                const unitDec = await contract.UNIT_DEC();
                decimals = Math.round(Math.log10(Number(unitDec)));
                await Promise.all([getContractPrice(), getMarginalPrices(), getUserShares()]);
            }
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    };

    const handleTransaction = async (type: 'buy' | 'sell') => {
        if (!appKit || isInvalid || !contractAddress) return;
        try {
            const provider = getProvider();
            if (!provider) return;
            const ethersProvider = new ethers.BrowserProvider(provider);
            const assetIndex = assetNames.indexOf(selectedAsset);
            if (assetIndex === -1) return;
            const cost = await getTransactionCost(assetIndex, amount.toString(), ethersProvider, contractAddress);
            if (cost) {
                transactionCost = cost.cost;
                pendingTransaction = type;
                showConfirmation = true;
            }
        } catch (error) {
            console.error('Error calculating transaction cost:', error);
        }
    };

    const confirmTransaction = async () => {
        if (!pendingTransaction || !transactionCost || !contractAddress) return;
        const caipAddress = appKit?.getCaipAddress();
        if (!caipAddress) return;
        const address = caipAddress.split(':')[2];
        
        try {
            const provider = getProvider();
            if (!provider) return;
            const ethersProvider = new ethers.BrowserProvider(provider);
            const signer = await ethersProvider.getSigner();
            
            const allowanceInfo = await checkAllowance(address, ethersProvider, contractAddress, chainId);
            if (!allowanceInfo) return;
            
            const requiredAmount = parseFloat(transactionCost);
            const currentAllowance = parseFloat(allowanceInfo.allowance);
            
            if (currentAllowance < requiredAmount) {
                isApproving = true;
                const approvalSuccess = await approveTokens(address, (requiredAmount * 2).toString(), signer, contractAddress, chainId);
                isApproving = false;
                if (!approvalSuccess) return;
            }
            
            const assetIndex = assetNames.indexOf(selectedAsset);
            let success = false;
            
            if (pendingTransaction === 'buy') {
                isBuying = true;
                success = await buyShares(assetIndex, amount.toString(), signer, contractAddress);
                isBuying = false;
            } else {
                isSelling = true;
                success = await sellShares(assetIndex, amount.toString(), signer, contractAddress);
                isSelling = false;
            }
            
            if (success) await Promise.all([getContractPrice(), getMarginalPrices(), getUserShares()]);
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
            if (!caipAddress) { await appKit.open(); return; }
            const provider = getProvider();
            if (!provider) return;
            const signer = await new ethers.BrowserProvider(provider).getSigner();
            const success = await redeemPayout(signer, contractAddress);
            if (success) await Promise.all([getContractPrice(), getMarginalPrices(), getUserShares()]);
            else showMarketNotResolved = true;
        } catch (error) {
            console.error('Error during redeem:', error);
            showMarketNotResolved = true;
        } finally {
            isRedeeming = false;
        }
    };

    $effect(() => { chainId = get(currentChainId); currentChainConfig = get(currentChain); });
    $effect(() => { if (chainId && dataset) loadMarketData(); });
    $effect(() => { getContractPrice(); });
    $effect(() => { isDarkMode = document.documentElement.classList.contains('dark'); });
    $effect(() => { if (appKit && assetNames.length > 0) getUserShares(); });

    const decrement = () => {
        if (amount > 1) amount -= 1;
    };

    const increment = () => {
        amount += 1;
    };

    const handleBuy = async () => {
        await handleTransaction('buy');
    };

    const handleSell = async () => {
        await handleTransaction('sell');
    };

    onMount(loadMarketData);

    const chartColors = $derived(getChartColors(Math.max(10, assetNames.length)));
    const options: ApexOptions = $derived({
        colors: chartColors.slice(0, 2),
        series: [
            { name: "Current percentage", data: assetNames.map((name, i) => ({ x: name, y: currentAllocationData[i] })) },
            { name: "Margin price", data: assetNames.map((name, i) => ({ x: name, y: marginalPrices[i] })) }
        ],
        chart: { type: "bar", height: "320px", toolbar: { show: false }, foreColor: isDarkMode ? '#f9fafb' : '#111827' },
        plotOptions: { bar: { horizontal: false, columnWidth: "70%", borderRadius: 8 } },
        tooltip: { shared: true, intersect: false, theme: isDarkMode ? 'dark' : 'light' },
        grid: { show: false },
        dataLabels: { enabled: false },
        legend: { show: false },
        xaxis: { labels: { style: { colors: isDarkMode ? '#f9fafb' : '#111827' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: (value: number) => value.toFixed(3), style: { colors: isDarkMode ? '#f9fafb' : '#111827' } } }
    });

    const lineChartOptions: ApexOptions = $derived({
        chart: { height: "320px", type: "line", toolbar: { show: false }, foreColor: isDarkMode ? '#f9fafb' : '#111827' },
        colors: chartColors,
        series: assetNames.map((name, i) => ({ name, data: dataRows.map(row => row[i] || null) })),
        stroke: { width: 6, curve: "smooth" },
        grid: { borderColor: isDarkMode ? '#374151' : '#e5e7eb' },
        legend: { labels: { colors: isDarkMode ? '#f9fafb' : '#111827' } },
        tooltip: { shared: true, intersect: false, theme: isDarkMode ? 'dark' : 'light' },
        xaxis: { categories: dataDates.length ? dataDates.map(d => d.toLocaleDateString()) : dataRows.map((_, i) => `Event ${i + 1}`), labels: { show: false } },
        yaxis: { labels: { formatter: (value: number) => value.toFixed(3), style: { colors: isDarkMode ? '#f9fafb' : '#111827' } } }
    });

    const separateChartOptions = $derived(
        assetNames.map((name, index) => ({
            chart: { height: "200px", type: "line" as const, toolbar: { show: false }, foreColor: isDarkMode ? '#f9fafb' : '#111827' },
            colors: [chartColors[index % chartColors.length]],
            series: [{ name, data: dataRows.map(row => row[index] || null) }],
            stroke: { width: 3, curve: "smooth" as const },
            grid: { borderColor: isDarkMode ? '#374151' : '#e5e7eb' },
            title: { text: name, style: { color: isDarkMode ? '#f9fafb' : '#111827' } },
            tooltip: { shared: false, intersect: false, theme: isDarkMode ? 'dark' : 'light' },
            xaxis: { categories: dataDates.length ? dataDates.map(d => d.toLocaleDateString()) : dataRows.map((_, i) => `Event ${i + 1}`), labels: { show: false } },
            yaxis: { labels: { formatter: (value: number) => value.toFixed(3), style: { colors: isDarkMode ? '#f9fafb' : '#111827' } } }
        }))
    );
</script>

<div class="grid grid-cols-3 items-start gap-8 p-8 theme-surface min-h-screen">
    <div class="col-span-2">
        {#if loading}
            <p class="theme-text">Loading chart...</p>
        {:else if error}
            <Alert color="red">{error}</Alert>
        {:else}
            <Chart {options} />
        {/if}
    </div>
    <Card class="h-full p-6 theme-card theme-border shadow-lg hover:opacity-90 transition-opacity">
        <form class="flex h-full flex-col justify-center">
            <div class="mb-4 flex items-end justify-start gap-4">
                <p class="text-4xl font-semibold theme-text">
                    ${price}
                </p>
                <div>
                    <p class="text-s font-normal theme-text-secondary">
                        ${pricePerShare}
                    </p>
                    <p class="text-s font-normal theme-text-secondary">
                        per share
                    </p>
                </div>
            </div>
            <Label class="mb-4 space-y-2 theme-text">
                <span>Asset</span>
                <Select bind:value={selectedAsset} items={selectItems} class="theme-card theme-border theme-text" />
            </Label>
            <Label class="mb-4 space-y-2 theme-text">
                <span>Shares</span>
                <div class="relative">
                    <Input
                        bind:value={amount}
                        type="number"
                        name="amount"
                        class="w-full pe-24 theme-card theme-border theme-text"
                        required
                    />
                    <div class="absolute inset-y-0 end-0 flex items-center pe-2">
                        <Button
                            onclick={decrement}
                            type="button"
                            color="light"
                            class="!p-1.5 text-xs !font-normal theme-card theme-text">-1</Button>
                        <Button
                            onclick={increment}
                            type="button"
                            color="light"
                            class="!p-1.5 ms-1 text-xs !font-normal theme-card theme-text">+1</Button>
                    </div>
                </div>
                {#if isInvalid}
                    <Alert>Shares must be a positive number.</Alert>
                {/if}
            </Label>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <Button
                    onclick={handleBuy}
                    size="xl"
                    class="w-full"
                    disabled={isInvalid || isBuying}
                    color="green">{isBuying ? 'Buying...' : 'Buy'}</Button
                >
                <Button
                    onclick={handleSell}
                    size="xl"
                    class="w-full"
                    disabled={isInvalid || isSelling}
                    color="red">{isSelling ? 'Selling...' : 'Sell'}</Button
                >
            </div>
            <Button
                onclick={handleRedeem}
                size="xl"
                class="w-full"
                color="orange"
                disabled={isRedeeming}
                >{isRedeeming ? 'Redeeming...' : 'Redeem'}</Button
            >
        </form>
    </Card>
    <div class="col-span-3 rounded-lg theme-card p-4 md:p-6 theme-border shadow-lg hover:opacity-90 transition-opacity">
        <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold theme-text">
                Historical Data
            </h3>
            <Button
                class="theme-btn-primary"
                size="sm"
                onclick={() => combinedMode = !combinedMode}
            >
                {combinedMode ? "Separate Charts" : "Combined Chart"}
            </Button>
        </div>
        {#if loading}
            <p class="theme-text">Loading chart...</p>
        {:else if error}
            <Alert color="red">{error}</Alert>
        {:else if combinedMode}
            <Chart options={lineChartOptions} />
        {:else}
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                {#each separateChartOptions as chartOption}
                    <div class="rounded-lg theme-border p-4 theme-card shadow-md hover:opacity-90 transition-opacity">
                        <Chart options={chartOption} />
                    </div>
                {/each}
            </div>
        {/if}
    </div>
    
    <!-- User Holdings Section -->
    <div class="col-span-3 rounded-lg theme-card p-4 md:p-6 theme-border shadow-lg hover:opacity-90 transition-opacity mt-4">
        <div class="mb-6">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h3 class="text-lg font-semibold theme-text">
                        Your Holdings
                    </h3>
                    <p class="text-sm theme-text-secondary">
                        Current share positions across all assets
                    </p>
                </div>
                {#if userShares.some(share => share > 0)}
                    <div class="text-right">
                        <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                            {userShares.reduce((total, shares, index) => 
                                total + (shares * (currentAllocationData[index] || 0)), 0
                            ).toFixed(4)}
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            Total Estimated Payout
                        </p>
                    </div>
                {/if}
            </div>
        </div>
        
        {#if userShares.some(share => share > 0)}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each assetNames as assetName, index}
                    {#if userShares[index] > 0}
                        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="font-medium text-blue-800 dark:text-blue-200">
                                    {assetName}
                                </h4>
                            </div>
                            
                            <!-- Shares Owned -->
                            <div class="mb-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-blue-600 dark:text-blue-300">
                                        Shares Owned:
                                    </span>
                                    <span class="text-xl font-bold text-blue-900 dark:text-blue-100">
                                        {userShares[index].toFixed(3)}
                                    </span>
                                </div>
                            </div>
                            
                            <!-- Current Variable Distribution -->
                            {#if currentAllocationData[index] !== undefined}
                                <div class="mb-3">
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-blue-600 dark:text-blue-300">
                                            Current Distribution:
                                        </span>
                                        <span class="text-lg font-semibold text-blue-800 dark:text-blue-200">
                                            {(currentAllocationData[index] * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                                
                                <!-- Estimated Instant Payout -->
                                <div class="pt-2 border-t border-blue-200 dark:border-blue-700">
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm font-medium text-blue-700 dark:text-blue-300">
                                            Estimated Payout:
                                        </span>
                                        <span class="text-lg font-bold text-green-700 dark:text-green-400">
                                            {(userShares[index] * currentAllocationData[index]).toFixed(4)}
                                        </span>
                                    </div>
                                    <p class="text-xs text-blue-500 dark:text-blue-400 mt-1">
                                        (shares × distribution)
                                    </p>
                                </div>
                            {/if}
                            
                            <!-- Current Price -->
                            {#if marginalPrices[index] > 0}
                                <div class="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                                    <p class="text-xs text-blue-500 dark:text-blue-400">
                                        Current price: {marginalPrices[index].toFixed(4)}
                                    </p>
                                </div>
                            {/if}
                        </div>
                    {/if}
                {/each}
            </div>
        {:else}
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg class="mx-auto h-12 w-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p class="text-lg font-medium">No holdings yet</p>
                <p class="text-sm">Buy some shares to see your positions here</p>
            </div>
        {/if}
    </div>
</div>

<!-- Transaction Confirmation Modal -->
<Modal bind:open={showConfirmation} title="Confirm Transaction">
    {#if pendingTransaction && transactionCost}
        <div class="space-y-4">
            <div class="text-center">
                <h3 class="text-lg font-semibold">
                    {pendingTransaction === 'buy' ? 'Buy' : 'Sell'} {amount} shares of {selectedAsset}
                </h3>
                <p class="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    Cost: {transactionCost} tokens
                </p>
            </div>

            <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <p class="text-sm text-yellow-800 dark:text-yellow-200">
                    This transaction will require token approval if you haven't approved enough tokens yet.
                    You may see two transactions: one for approval and one for the trade.
                </p>
            </div>

            <div class="flex space-x-4">
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
                    onclick={() => showConfirmation = false}
                    color="alternative"
                    class="flex-1"
                    disabled={isBuying || isSelling || isApproving}
                >
                    Cancel
                </Button>
            </div>
        </div>
    {/if}
</Modal>

<!-- Market Not Resolved Modal -->
<Modal bind:open={showMarketNotResolved} title="Market Not Resolved">
    <div class="space-y-6">
        <div class="text-center">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 mb-4">
                <svg class="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Market Not Resolved
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
                The market for this dataset on the current chain is not yet resolved.
            </p>
        </div>
        
        <div class="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-orange-800 dark:text-orange-200">
                        What this means:
                    </h3>
                    <div class="mt-2 text-sm text-orange-700 dark:text-orange-300">
                        <ul class="list-disc list-inside space-y-1">
                            <li>The market outcome has not been determined yet</li>
                            <li>You may need to wait for the market to resolve</li>
                            <li>Ensure you're on the correct chain</li>
                            <li>Check if the market contract is properly deployed</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="flex justify-end space-x-3">
            <Button 
                onclick={() => showMarketNotResolved = false}
                color="alternative"
                size="sm"
            >
                Close
            </Button>
        </div>
    </div>
</Modal>

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
