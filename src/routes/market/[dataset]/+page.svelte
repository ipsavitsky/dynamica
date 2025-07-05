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
    let combinedMode = $state(true); // Toggle between combined and separate chart modes

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

    const formatYAxisLabel = (value: any) => {
        if (typeof value === "number") {
            return value.toFixed(2);
        }
        return value;
    };

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
            labels: {
                formatter: function (value) {
                    return value.toFixed(3);
                },
            },
        },
        fill: {
            opacity: 1,
        },
    });

    // Define consistent colors for assets
    const assetColors = [
        "#1A56DB", "#FDBA8C", "#31C48D", "#F98080", "#9061F9", 
        "#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#06B6D4"
    ];

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
        colors: assetColors,
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
            show: true,
            labels: {
                formatter: function (value) {
                    return value.toFixed(3);
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
                },
                colors: [assetColors[index % assetColors.length]],
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
                    },
                },
                xaxis: {
                    categories: dataRows.map((_: number[], index: number) => `Event ${index + 1}`),
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
                    show: true,
                    min: validData.length > 0 ? minValue - padding : undefined,
                    max: validData.length > 0 ? maxValue + padding : undefined,
                    labels: {
                        formatter: function (value) {
                            return value.toFixed(3);
                        },
                    },
                },
            };
        })
    );
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
        <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Historical Data
            </h3>
            <Button
                color="alternative"
                size="sm"
                onclick={() => combinedMode = !combinedMode}
            >
                {combinedMode ? "Separate Charts" : "Combined Chart"}
            </Button>
        </div>
        {#if loading}
            <p>Loading chart...</p>
        {:else if error}
            <Alert color="red">{error}</Alert>
        {:else if combinedMode}
            <Chart options={lineChartOptions} />
        {:else}
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                {#each separateChartOptions as chartOption}
                    <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <Chart options={chartOption} />
                    </div>
                {/each}
            </div>
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
