<script lang="ts">
    import { onMount } from "svelte";
    import type { ApexOptions } from "apexcharts";
    import { Chart } from "@flowbite-svelte-plugins/chart";
    import { Card, Button, Label, Input, Alert, Select } from "flowbite-svelte";
    import { ethers } from "ethers";
    import { page } from "$app/stores";
    import { dataService, type DataPoint } from "$lib/api";
    import { contractABI } from "$lib/abi";

    const contractAddress = "0x6d54f93e64c29A0D8FCF01039d1cbC701553c090";


    // Get the dataset name from the URL
    const { dataset } = $page.params;

    let assetNames = $state<string[]>([]);
    let dataRows = $state<number[][]>([]);
    let currentAllocationData = $state<number[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);

    let marginalPrices = $state<number[]>([]);

    let selectedAsset = $state("");
    let selectItems = $derived(assetNames.map((name) => ({ name, value: name })));

    let amount = $state(1);
    let decimals = $state(18); // Default to 18, will be updated from contract

    let isInvalid = $derived(amount <= 0);

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
            const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/b9794ad1ddf84dfb8c34d6bb5dca2001");
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
            const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/b9794ad1ddf84dfb8c34d6bb5dca2001");
            const contract = new ethers.Contract(contractAddress, contractABI, provider);

            const deltaOutcomeAmounts = new Array(assetNames.length).fill(0);
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
            const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/b9794ad1ddf84dfb8c34d6bb5dca2001");
            const contract = new ethers.Contract(contractAddress, contractABI, provider);
            const prices = await Promise.all(
                assetNames.map((_, i) => contract.calcMarginalPrice(i))
            );
            marginalPrices = prices.map(p => parseFloat(ethers.formatUnits(p, decimals)));
        } catch (error) {
            console.error("Error fetching marginal prices from contract:", error);
        }
    }

    onMount(async () => {
        try {
            loading = true;
            let data: DataPoint;
            if (dataset === 'drivers') {
                data = await dataService.getDriverData();
            } else if (dataset === 'crypto') {
                data = await dataService.getCryptoData();
            } else {
                throw new Error(`Unknown dataset: ${dataset}`);
            }

            assetNames = data.headers;
            dataRows = data.rows;
            marginalPrices = new Array(assetNames.length).fill(0);
            if (data.rows.length > 0) {
                currentAllocationData = data.rows[data.rows.length - 1];
            }

            selectedAsset = assetNames[0] || "";

            // Now fetch contract data
            await getUnitDec();
            await Promise.all([getContractPrice(), getMarginalPrices()]);

        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    });

    $effect(() => {
        getContractPrice();
    });

    let options: ApexOptions = $derived({
        colors: ["#1A56DB", "#FDBA8C"],
        series: [
            {
                name: "Current Allocation",
                color: "#1A56DB",
                data: assetNames.map((name: string, i: number) => ({
                    x: name,
                    y: currentAllocationData[i],
                })),
            },
            {
                name: "Proposed Allocation",
                color: "#FDBA8C",
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
                    cssClass:
                        "text-xs font-normal fill-gray-500 dark:fill-gray-400",
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
        },
        fill: {
            opacity: 1,
        },
    });

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
        },
        tooltip: {
            enabled: true,
            x: {
                show: false,
            },
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
        },
        series: [],
        legend: {
            show: true,
        },
        xaxis: {
            categories: [],
            labels: {
                show: false,
                style: {
                    fontFamily: "Inter, sans-serif",
                    cssClass:
                        "text-xs font-normal fill-gray-500 dark:fill-gray-400",
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
            show: false,
        },
    });
    $effect(() => {
        try {
            // Transpose the data for ApexCharts series format
            const series = assetNames.map(
                (assetName: string, colIndex: number) => {
                    return {
                        name: assetName,
                        data: dataRows.map(
                            (row: number[]) => row[colIndex] || null,
                        ),
                    };
                },
            );

            lineChartOptions.series = series;
            if (lineChartOptions.xaxis) {
                lineChartOptions.xaxis.categories = dataRows.map(
                    (_: number[], index: number) => `Event ${index + 1}`,
                );
            }
        } catch (error) {
            console.error("Failed to process asset data:", error);
        }
    });
</script>

<div class="grid grid-cols-3 items-start gap-8 p-8">
    <div class="col-span-2">
        {#if loading}
            <p>Loading chart...</p>
        {:else if error}
            <Alert color="red">{error}</Alert>
        {:else}
            <Chart {options} />
        {/if}
    </div>
    <Card class="h-full p-6">
        <form class="flex h-full flex-col justify-center">
            <div class="mb-4 flex items-end justify-start gap-4">
                <p class="text-4xl font-semibold text-gray-900 dark:text-white">
                    ${price}
                </p>
                <div>
                    <p
                        class="text-s font-normal text-gray-500 dark:text-gray-400"
                    >
                        ${pricePerShare}
                    </p>
                    <p
                        class="text-s font-normal text-gray-500 dark:text-gray-400"
                    >
                        per share
                    </p>
                </div>
            </div>
            <Label class="mb-4 space-y-2">
                <span>Asset</span>
                <Select bind:value={selectedAsset} items={selectItems} />
            </Label>
            <Label class="mb-4 space-y-2">
                <span>Shares</span>
                <div class="relative">
                    <Input
                        bind:value={amount}
                        type="number"
                        name="amount"
                        class="w-full pe-24"
                        required
                    />
                    <div
                        class="absolute inset-y-0 end-0 flex items-center pe-2"
                    >
                        <Button
                            onclick={decrement}
                            type="button"
                            color="light"
                            class="!p-1.5 text-xs !font-normal">-1</Button
                        >
                        <Button
                            onclick={increment}
                            type="button"
                            color="light"
                            class="!p-1.5 ms-1 text-xs !font-normal">+1</Button
                        >
                    </div>
                </div>
                {#if isInvalid}
                    <Alert>Shares must be a positive number.</Alert>
                {/if}
            </Label>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <Button
                    type="submit"
                    size="xl"
                    class="w-full"
                    disabled={isInvalid}
                    color="green">Buy</Button
                >
                <Button
                    type="submit"
                    size="xl"
                    class="w-full"
                    disabled={isInvalid}
                    color="red">Sell</Button
                >
            </div>
            <Button type="button" size="xl" class="w-full" color="orange"
                >Redeem</Button
            >
        </form>
    </Card>
    <div class="col-span-3 rounded-lg bg-white p-4 dark:bg-gray-800 md:p-6">
        {#if loading}
            <p>Loading chart...</p>
        {:else if error}
            <Alert color="red">{error}</Alert>
        {:else}
            <Chart options={lineChartOptions} />
        {/if}
    </div>
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
