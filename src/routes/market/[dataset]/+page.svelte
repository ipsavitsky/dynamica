<script lang="ts">
    import { onMount } from "svelte";
    import type { ApexOptions } from "apexcharts";
    import { Chart } from "@flowbite-svelte-plugins/chart";
    import { Card, Button, Label, Input, Alert, Select, Modal } from "flowbite-svelte";
    import { ethers } from "ethers";
    import { page } from "$app/stores";
    import { dataService, type DataPoint } from "$lib/api";
    import { contractABI } from "$lib/abi";
    import { buyShares, sellShares, redeemPayout, checkAllowance, approveTokens, getTransactionCost, getTokenBalance } from "$lib/utils";
    import { initializeAppKit } from "$lib/appkit";
    import { browser } from "$app/environment";
    import { getChartColors, getApexChartTheme, themeClasses } from "$lib/theme";
    import { getContractProvider, getChainProvider } from "$lib/utils";
    import { getMarketAddressByChain, getMarketConfigByChain } from "$lib/config/index";
    import { currentChainId, currentChain } from "$lib/chainManager";
    import { get } from "svelte/store";

    // Get the dataset name from the URL
    const { dataset } = $page.params;
    
    // Get current chain ID
    let chainId = $state(get(currentChainId));
    let currentChainConfig = $state(get(currentChain));
    
    // Subscribe to chain changes
    $effect(() => {
        chainId = get(currentChainId);
        currentChainConfig = get(currentChain);
    });
    
    // Get contract address for this dataset and chain
    let contractAddress = $derived(getMarketAddressByChain(chainId, dataset));
    let marketConfig = $derived(getMarketConfigByChain(chainId, dataset));

    let assetNames = $state<string[]>([]);
    let dataRows = $state<number[][]>([]);
    let currentAllocationData = $state<number[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);

    let marginalPrices = $state<number[]>([]);
    let userShares = $state<number[]>([]);

    let selectedAsset = $state("");
    let selectItems = $derived(assetNames.map((name) => ({ name, value: name })));

    let amount = $state(1);
    let decimals = $state(18); // Default to 18, will be updated from contract
    let combinedMode = $state(true); // Toggle between combined and separate chart modes
    let isDarkMode = $state(false);

    let isInvalid = $derived(amount <= 0);

    let isBuying = $state(false);
    let isSelling = $state(false);
    let isRedeeming = $state(false);
    let isApproving = $state(false);

    let transactionCost = $state<string | null>(null);
    let showConfirmation = $state(false);
    let pendingTransaction = $state<'buy' | 'sell' | null>(null);

    let appKit: any = null;

    // Initialize AppKit in browser
    if (browser) {
        appKit = initializeAppKit();
    }

    const increment = () => (amount += 1);
    const decrement = () => (amount = Math.max(0, amount - 1));

    let price = $state("..."); // Initial state

    let pricePerShare = $derived(
        !isInvalid && price !== "..." && price !== "Error"
            ? (parseFloat(price) / amount).toFixed(2)
            : "0.00",
    );

    const getUnitDec = async () => {
        try {
            if (!contractAddress) {
                console.error("No contract address available");
                return;
            }
            const provider = getChainProvider(chainId);
            const contract = new ethers.Contract(contractAddress, contractABI, provider);
            const unitDec = await contract.UNIT_DEC();
            decimals = Math.round(Math.log10(Number(unitDec)));
        } catch (error) {
            console.error("Error fetching UNIT_DEC from contract:", error);
        }
    }

    const getContractPrice = async () => {
        if (isInvalid) {
            price = "0.00";
            return;
        }
        try {
            if (!contractAddress) {
                price = "Error";
                return;
            }
            const provider = getChainProvider(chainId);
            const contract = new ethers.Contract(contractAddress, contractABI, provider);

            const outcomeSlotCount = await contract.outcomeSlotCount();
            const deltaOutcomeAmounts = new Array(Number(outcomeSlotCount)).fill(0);
            const assetIndex = assetNames.indexOf(selectedAsset);
            if (assetIndex !== -1) {
                deltaOutcomeAmounts[assetIndex] = ethers.parseUnits(amount.toString(), decimals);
            }

            const netCost = await contract.calcNetCost(deltaOutcomeAmounts);
            const cost = parseFloat(ethers.formatUnits(netCost, decimals));
            price = Math.abs(cost).toFixed(2);
        } catch (error) {
            console.error("Error fetching price from contract:", error);
            price = "Error";
        }
    };

    const getMarginalPrices = async () => {
        try {
            if (!contractAddress) {
                console.error("No contract address available");
                return;
            }
            const provider = getChainProvider(chainId);
            const contract = new ethers.Contract(contractAddress, contractABI, provider);
            const prices = await Promise.all(
                assetNames.map((_, i) => contract.calcMarginalPrice(i))
            );
            marginalPrices = prices.map(p => parseFloat(ethers.formatUnits(p, decimals)));
        } catch (error) {
            console.error("Error fetching marginal prices from contract:", error);
        }
    }

    const getUserShares = async () => {
        try {
            if (!appKit) return;
            
            const caipAddress = appKit.getCaipAddress();
            if (!caipAddress) {
                userShares = new Array(assetNames.length).fill(0);
                return;
            }
            
            if (!contractAddress) {
                console.error("No contract address available");
                userShares = new Array(assetNames.length).fill(0);
                return;
            }
            
            const userAddress = caipAddress.split(':')[2];
            const provider = getChainProvider(chainId);
            const contract = new ethers.Contract(contractAddress, contractABI, provider);
            
            const shares = await Promise.all(
                assetNames.map((_, i) => contract.userShares(userAddress, i))
            );
            userShares = shares.map(share => parseFloat(ethers.formatUnits(share, decimals)));
        } catch (error) {
            console.error("Error fetching user shares from contract:", error);
            userShares = new Array(assetNames.length).fill(0);
        }
    }

    $effect(() => {
        // Watch for changes in amount and selectedAsset
        amount;
        selectedAsset;
        getContractPrice();
    });

    // Watch for chain changes
    $effect(() => {
        if (chainId && dataset) {
            // Reload data when chain changes
            loadMarketData();
        }
    });

    // Separate function to load market data
    async function loadMarketData() {
        try {
            loading = true;
            error = null;
            
            // Check if market is available on current chain
            if (!marketConfig || !marketConfig.enabled) {
                throw new Error(`Market "${dataset}" is not available on ${currentChainConfig?.name || 'this chain'}. Please switch to a chain where this market is deployed.`);
            }
            
            let data: DataPoint;
            
            // Use the data source from market config
            if (marketConfig && marketConfig.dataSource) {
                // Fetch data based on the configured data source
                if (marketConfig.dataSource === 'drivers') {
                    data = await dataService.getDriverData();
                } else if (marketConfig.dataSource === 'crypto') {
                    data = await dataService.getCryptoData();
                } else {
                    // Fallback to dataset name for backward compatibility
                    if (dataset === 'drivers') {
                        data = await dataService.getDriverData();
                    } else if (dataset === 'crypto') {
                        data = await dataService.getCryptoData();
                    } else {
                        throw new Error(`Unknown data source: ${marketConfig.dataSource}`);
                    }
                }
            } else {
                // Fallback to legacy behavior
                if (dataset === 'drivers') {
                    data = await dataService.getDriverData();
                } else if (dataset === 'crypto') {
                    data = await dataService.getCryptoData();
                } else {
                    throw new Error(`Unknown dataset: ${dataset}`);
                }
            }

            assetNames = data.headers;
            dataRows = data.rows;
            marginalPrices = new Array(assetNames.length).fill(0);
            userShares = new Array(assetNames.length).fill(0);
            if (data.rows.length > 0) {
                currentAllocationData = data.rows[data.rows.length - 1];
            }

            selectedAsset = assetNames[0] || "";

            // Check dark mode
            isDarkMode = document.documentElement.classList.contains('dark');

            // Now fetch contract data
            await getUnitDec();
            await Promise.all([getContractPrice(), getMarginalPrices(), getUserShares()]);

        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    onMount(async () => {
        await loadMarketData();
    });

    const formatYAxisLabel = (value: any) => {
        if (typeof value === "number") {
            return value.toFixed(2);
        }
        return value;
    };

    let options: ApexOptions = $derived({
        colors: getChartColors(2, isDarkMode),
        series: [
            {
                name: "Current percentage",
                color: getChartColors(2, isDarkMode)[0],
                data: assetNames.map((name: string, i: number) => ({
                    x: name,
                    y: currentAllocationData[i],
                })),
            },
            {
                name: "Margin price",
                color: getChartColors(2, isDarkMode)[1],
                data: assetNames.map((name: string, i: number) => ({
                    x: name,
                    y: marginalPrices[i],
                })),
            },
        ],
        chart: {
            type: "bar",
            height: "320px",
            fontFamily: "Inter, sans-serif",
            toolbar: {
                show: false,
            },
            foreColor: isDarkMode ? '#f9fafb' : '#111827',
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "70%",
                borderRadiusApplication: "end",
                borderRadius: 8,
            },
        },
        tooltip: {
            shared: true,
            intersect: false,
            style: {
                fontFamily: "Inter, sans-serif",
            },
            theme: isDarkMode ? 'dark' : 'light',
        },
        states: {
            hover: {
                filter: {
                    type: "darken",
                },
            },
        },
        stroke: {
            show: true,
            width: 0,
            colors: ["transparent"],
        },
        grid: {
            show: false,
            strokeDashArray: 4,
            padding: {
                left: 2,
                right: 2,
                top: -14,
            },
        },
        dataLabels: {
            enabled: false,
        },
        legend: {
            show: false,
        },
        xaxis: {
            floating: false,
            labels: {
                show: true,
                style: {
                    fontFamily: "Inter, sans-serif",
                    colors: isDarkMode ? '#f9fafb' : '#111827',
                },
            },
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
        },
        yaxis: {
            show: true,
            labels: {
                formatter: function (value: number) {
                    return value.toFixed(3);
                },
                style: {
                    colors: isDarkMode ? '#f9fafb' : '#111827',
                },
            },
        },
        fill: {
            opacity: 1,
        },
    });

    // Define consistent colors for assets using theme colors
    const assetColors = $derived(getChartColors(Math.max(10, assetNames.length), isDarkMode));

    let lineChartOptions: ApexOptions = $derived({
        chart: {
            height: "320px",
            type: "line",
            fontFamily: "Inter, sans-serif",
            dropShadow: {
                enabled: false,
            },
            toolbar: {
                show: false,
            },
            foreColor: isDarkMode ? '#f9fafb' : '#111827',
        },
        colors: assetColors,
        tooltip: {
            enabled: true,
            x: {
                show: false,
            },
            theme: isDarkMode ? 'dark' : 'light',
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            width: 6,
            curve: "smooth",
        },
        grid: {
            show: true,
            strokeDashArray: 4,
            padding: {
                left: 2,
                right: 2,
                top: -26,
            },
            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
        },
        series: assetNames.map((assetName: string, colIndex: number) => ({
            name: assetName,
            data: dataRows.map((row: number[]) => row[colIndex] || null),
        })),
        legend: {
            show: true,
            labels: {
                colors: isDarkMode ? '#f9fafb' : '#111827',
            },
        },
        xaxis: {
            categories: dataRows.map((_: number[], index: number) => `Event ${index + 1}`),
            labels: {
                show: false,
                style: {
                    fontFamily: "Inter, sans-serif",
                    colors: isDarkMode ? '#f9fafb' : '#111827',
                },
            },
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
        },
        yaxis: {
            show: true,
            labels: {
                formatter: function (value: number) {
                    return value.toFixed(3);
                },
                style: {
                    colors: isDarkMode ? '#f9fafb' : '#111827',
                },
            },
        },
    });

    let separateChartOptions: ApexOptions[] = $derived(
        assetNames.map((assetName, index) => {
            const assetData = dataRows.map((row: number[]) => row[index] || null);
            const validData = assetData.filter((val: number | null) => val !== null) as number[];
            const minValue = Math.min(...validData);
            const maxValue = Math.max(...validData);
            const padding = (maxValue - minValue) * 0.1;

            return {
                chart: {
                    height: "200px",
                    type: "line",
                    fontFamily: "Inter, sans-serif",
                    dropShadow: {
                        enabled: false,
                    },
                    toolbar: {
                        show: false,
                    },
                    foreColor: isDarkMode ? '#f9fafb' : '#111827',
                },
                colors: [assetColors[index % assetColors.length]],
                tooltip: {
                    enabled: true,
                    x: {
                        show: false,
                    },
                    theme: isDarkMode ? 'dark' : 'light',
                },
                dataLabels: {
                    enabled: false,
                },
                stroke: {
                    width: 4,
                    curve: "smooth",
                },
                grid: {
                    show: true,
                    strokeDashArray: 4,
                    padding: {
                        left: 2,
                        right: 2,
                        top: -26,
                    },
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                },
                series: [
                    {
                        name: assetName,
                        data: assetData,
                    },
                ],
                legend: {
                    show: false,
                },
                title: {
                    text: assetName,
                    align: "left",
                    style: {
                        fontFamily: "Inter, sans-serif",
                        fontWeight: "600",
                        fontSize: "16px",
                        color: isDarkMode ? '#f9fafb' : '#111827',
                    },
                },
                xaxis: {
                    categories: dataRows.map((_: number[], index: number) => `Event ${index + 1}`),
                    labels: {
                        show: false,
                        style: {
                            fontFamily: "Inter, sans-serif",
                            colors: isDarkMode ? '#f9fafb' : '#111827',
                        },
                    },
                    axisBorder: {
                        show: false,
                    },
                    axisTicks: {
                        show: false,
                    },
                },
                yaxis: {
                    show: true,
                    min: validData.length > 0 ? minValue - padding : undefined,
                    max: validData.length > 0 ? maxValue + padding : undefined,
                    labels: {
                        formatter: function (value: number) {
                            return value.toFixed(3);
                        },
                        style: {
                            colors: isDarkMode ? '#f9fafb' : '#111827',
                        },
                    },
                },
            };
        })
    );
    // Setup theme observer
    $effect(() => {
        const darkModeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    isDarkMode = document.documentElement.classList.contains('dark');
                }
            });
        });

        darkModeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => {
            darkModeObserver.disconnect();
        };
    });

    // Refresh user shares when wallet connection changes
    $effect(() => {
        if (appKit && assetNames.length > 0) {
            getUserShares();
        }
    });

    async function getProvider() {
        if (!appKit) {
            console.log('AppKit not available, trying to reinitialize...');
            if (browser) {
                appKit = initializeAppKit();
            }
            if (!appKit) {
                console.error('Failed to initialize AppKit');
                return null;
            }
        }

        console.log('AppKit available:', !!appKit);
        console.log('AppKit methods:', Object.keys(appKit));

        let provider;

        // Try window.ethereum first as it usually works best for contract interactions
        if (typeof window !== 'undefined' && window.ethereum) {
            provider = window.ethereum;
            console.log('Using window.ethereum as primary provider');
        } else if (appKit.getProvider) {
            provider = appKit.getProvider();
            console.log('getProvider() returned:', provider);
        } else if (appKit.universalProvider) {
            provider = appKit.universalProvider;
            console.log('Got provider via universalProvider');
        } else if (appKit.getWalletProvider) {
            provider = appKit.getWalletProvider();
            console.log('Got provider via getWalletProvider');
        } else if (appKit.provider) {
            provider = appKit.provider;
            console.log('Got provider via .provider property');
        }

        if (!provider) {
            console.error('No provider available');
            console.log('Available appKit properties:', Object.keys(appKit));
            return null;
        }

        console.log('Provider found:', provider);
        return provider;
    }

    async function showTransactionPreview(type: 'buy' | 'sell') {
        if (!appKit || isInvalid) return;

        try {
            if (!contractAddress) {
                console.error('No contract address available');
                return;
            }

            const provider = await getProvider();
            if (!provider) return;

            const ethersProvider = new ethers.BrowserProvider(provider);
            const assetIndex = assetNames.indexOf(selectedAsset);

            if (assetIndex === -1) {
                console.error('Selected asset not found');
                return;
            }

            const cost = await getTransactionCost(assetIndex, amount.toString(), ethersProvider, contractAddress);
            if (cost) {
                transactionCost = cost.cost;
                pendingTransaction = type;
                showConfirmation = true;
            }
        } catch (error) {
            console.error('Error calculating transaction cost:', error);
        }
    }

    async function confirmTransaction() {
        if (!pendingTransaction || !transactionCost) return;

        if (!contractAddress) {
            console.error('No contract address available');
            return;
        }

        const caipAddress = appKit.getCaipAddress();
        if (!caipAddress) {
            console.log('Wallet not connected');
            return;
        }

        const address = caipAddress.split(':')[2]; // Extract address from CAIP format

        try {
            const provider = await getProvider();
            if (!provider) return;

            const ethersProvider = new ethers.BrowserProvider(provider);
            const signer = await ethersProvider.getSigner();

            // Check allowance first
            const allowanceInfo = await checkAllowance(address, ethersProvider, contractAddress);
            if (!allowanceInfo) return;

            const requiredAmount = parseFloat(transactionCost);
            const currentAllowance = parseFloat(allowanceInfo.allowance);

            console.log('Required amount:', requiredAmount);
            console.log('Current allowance:', currentAllowance);

            // Check token balance first
            const tokenBalance = await getTokenBalance(address, ethersProvider);
            if (!tokenBalance) {
                console.error('Could not get token balance');
                return;
            }

            const currentBalance = parseFloat(tokenBalance.balance);
            console.log('Current balance:', currentBalance);

            if (currentBalance < requiredAmount) {
                console.error('Insufficient token balance');
                alert(`Insufficient balance. Required: ${requiredAmount.toFixed(4)} ${tokenBalance.symbol}, Available: ${currentBalance.toFixed(4)} ${tokenBalance.symbol}`);
                return;
            }

            // If insufficient allowance, approve first
            if (currentAllowance < requiredAmount) {
                console.log('Insufficient allowance, requesting approval...');
                isApproving = true;

                // Approve a bit more than needed to avoid future approvals
                const approveAmount = (requiredAmount * 2).toString();
                const approvalSuccess = await approveTokens(address, approveAmount, signer, contractAddress);

                isApproving = false;

                if (!approvalSuccess) {
                    console.error('Token approval failed');
                    return;
                }
            }

            // Now execute the transaction
            const assetIndex = assetNames.indexOf(selectedAsset);
            let success = false;

            if (pendingTransaction === 'buy') {
                isBuying = true;
                success = await buyShares(assetIndex, amount.toString(), signer, contractAddress);
                isBuying = false;
            } else if (pendingTransaction === 'sell') {
                isSelling = true;
                success = await sellShares(assetIndex, amount.toString(), signer, contractAddress);
                isSelling = false;
            }

            if (success) {
                console.log(`${pendingTransaction} successful`);
                await Promise.all([getContractPrice(), getMarginalPrices(), getUserShares()]);
            }

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
    }

    async function handleBuy(event: Event) {
        event.preventDefault();
        await showTransactionPreview('buy');
    }

    async function handleSell(event: Event) {
        event.preventDefault();
        await showTransactionPreview('sell');
    }

    async function handleRedeem() {
        if (!appKit || isRedeeming) return;

        if (!contractAddress) {
            console.error('No contract address available');
            return;
        }

        isRedeeming = true;

        try {
            // Check if wallet is connected
            const caipAddress = appKit.getCaipAddress();
            if (!caipAddress) {
                console.log('Wallet not connected, opening connection modal...');
                await appKit.open();
                return;
            }

            const provider = await getProvider();
            if (!provider) return;

            // Ensure provider is connected
            console.log('Provider object:', provider);
            console.log('Provider methods:', Object.getOwnPropertyNames(provider));
            console.log('Provider prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(provider)));

            // Skip provider connection and try to use it directly
            console.log('Provider session:', provider.session);
            console.log('Provider connected:', provider.connected);
            console.log('Trying to use provider directly without calling connect...');

            const ethersProvider = new ethers.BrowserProvider(provider);
            const signer = await ethersProvider.getSigner();

            console.log('Redeeming payout...');
            const success = await redeemPayout(signer, contractAddress);

            if (success) {
                console.log('Redeem successful');
                await Promise.all([getContractPrice(), getMarginalPrices(), getUserShares()]);
            }
        } catch (error) {
            console.error('Error during redeem:', error);
        } finally {
            isRedeeming = false;
        }
    }
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
