<script lang="ts">
  import type { ApexOptions } from "apexcharts";
  import { Chart } from "@flowbite-svelte-plugins/chart";
  import { Card, Button, Label, Input, Alert } from "flowbite-svelte";
  import { ethers } from "ethers";
  import { getDeltaJS, UNIT_DEC } from "$lib/utils";

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
    }
  };

  let price = $state("..."); // Initial state

  $effect(() => {
    const calculatePrice = async () => {
      try {
        // Mock values for demonstration.
        // You would replace these with reactive state from your app.
        const q0 = "100";
        const q1 = "120";
        const targetWad = "700000000000000000"; // 0.7
        const first = true;

        const delta = await getDeltaJS(q0, q1, targetWad, first, mockContract);

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
        name: "Organic",
        color: "#1A56DB",
        data: [
          { x: "asset1", y: 231 },
          { x: "asset2", y: 122 },
          { x: "asset3", y: 63 }
        ]
      },
      {
        name: "Social media",
        color: "#FDBA8C",
        data: [
          { x: "asset1", y: 232 },
          { x: "asset2", y: 113 },
          { x: "asset3", y: 341 }
        ]
      }
    ],
    chart: {
      type: "bar",
      height: "320px",
      fontFamily: "Inter, sans-serif",
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "70%",
        borderRadiusApplication: "end",
        borderRadius: 8
      }
    },
    tooltip: {
      shared: true,
      intersect: false,
      style: {
        fontFamily: "Inter, sans-serif"
      }
    },
    states: {
      hover: {
        filter: {
          type: "darken"
        }
      }
    },
    stroke: {
      show: true,
      width: 0,
      colors: ["transparent"]
    },
    grid: {
      show: false,
      strokeDashArray: 4,
      padding: {
        left: 2,
        right: 2,
        top: -14
      }
    },
    dataLabels: {
      enabled: false
    },
    legend: {
      show: false
    },
    xaxis: {
      floating: false,
      labels: {
        show: true,
        style: {
          fontFamily: "Inter, sans-serif",
          cssClass: "text-xs font-normal fill-gray-500 dark:fill-gray-400"
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      show: false
    },
    fill: {
      opacity: 1
    }
  };
</script>

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

<div class="grid grid-cols-3 items-start gap-8 p-8">
  <div class="col-span-2">
    <Chart {options} />
  </div>
  <Card class="h-full p-6">
    <form class="flex h-full flex-col justify-center">
      <div class="mb-4 text-left">
        <p class="text-4xl font-semibold text-gray-900 dark:text-white">${price}</p>
      </div>
      <Label class="mb-4 space-y-2">
        <span>Amount</span>
        <div class="relative">
          <Input bind:value={amount} type="number" name="amount" class="w-full pe-24" required />
          <div class="absolute inset-y-0 end-0 flex items-center pe-2">
            <span class="ms-2 text-gray-500 dark:text-gray-400">$</span>
            <Button onclick={decrement} type="button" color="light" class="!p-1.5 text-xs !font-normal">-1$</Button>
            <Button onclick={increment} type="button" color="light" class="!p-1.5 ms-1 text-xs !font-normal">+1$</Button>
          </div>
        </div>
        {#if isInvalid}
            <Alert>Amount must be a positive number.</Alert>
        {/if}
      </Label>
      <Button type="submit" size="xl" class="w-full" disabled={isInvalid}>Buy</Button>
    </form>
  </Card>
</div>
