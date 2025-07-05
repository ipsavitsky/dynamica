<script lang="ts">
    import type { ApexOptions } from "apexcharts";
    import { Chart } from "@flowbite-svelte-plugins/chart";
    import { Card, Button, Label, Input, Alert, Select } from "flowbite-svelte";
    import { ethers } from "ethers";
    import { page } from "$app/stores";
    import { getDeltaJS, UNIT_DEC } from "$lib/utils";
    import * as fixtures from "$lib/fixtures";

    // Get the dataset name from the URL
    const { dataset } = $page.params;

    // Load the appropriate data from the fixtures
    const assetData = (fixtures as { [key: string]: string })[dataset] || "";
    if (!assetData) {
        console.error(`Dataset "${dataset}" not found in fixtures.`);
    }

    // Parse generic asset data
    const lines = assetData.trim().split("\n");
    const assetNames = lines[0].split(",");
    const dataRows = lines
        .slice(1)
        .map((line: string) =>
            line.split(",").map((val: string) => parseFloat(val)),
        );
    const lastDataLine = dataRows[dataRows.length - 1] || [];

    // Bar Chart Data
    const currentAllocationData = lastDataLine;
    const proposedAllocationData = new Array(assetNames.length).fill(1);

    let selectedAsset = $state(assetNames[0] || "");
    const selectItems = assetNames.map((name) => ({ name, value: name }));

    let amount = $state(1);

    let isInvalid = $derived(amount <= 0);

    const increment = () => (amount += 1);
    const decrement = () => (amount = Math.max(0, amount - 1));

    // Mock contract, as we can't make live calls.
    // Replace this with your actual contract instance.
    const mockContract = {
        getB: async (q_s: bigint[]) => {
            // Mock implementation: alpha * (q0 + q1)
            const alpha = 500000000000000000n; // 0.5
            const sum = q_s[0] + q_s[1];
            return (sum * alpha) / UNIT_DEC;
        },
        ln: async (val: bigint) => {
            // Mock ln() using JS Math.log. This is a rough approximation.
            const valFloat = parseFloat(ethers.formatUnits(val, 18));
            const lnValFloat = Math.log(valFloat);
            return ethers.parseUnits(lnValFloat.toString(), 18);
        },
    };

    let price = $state("..."); // Initial state

    let pricePerShare = $derived(
        !isInvalid && price !== "..." && price !== "Error"
            ? (parseFloat(price) / amount).toFixed(2)
            : "0.00",
    );

    $effect(() => {
        const calculatePrice = async () => {
            try {
                // Mock values for demonstration.
                // You would replace these with reactive state from your app.
                const q0 = "100";
                const q1 = "120";
                const targetWad = "700000000000000000"; // 0.7
                const first = true;

                const delta = await getDeltaJS(
                    q0,
                    q1,
                    targetWad,
                    first,
                    mockContract,
                );

                // Format the BigInt result for display.
                price = parseFloat(ethers.formatUnits(delta, 18)).toFixed(2);
            } catch (error) {
                console.error("Error calculating price:", error);
                price = "Error";
            }
        };
        calculatePrice();
    });

    const options: ApexOptions = {
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
                    y: proposedAllocationData[i],
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
    };

    let lineChartOptions = $state<ApexOptions>({
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
        <Chart {options} />
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
        <Chart options={lineChartOptions} />
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
