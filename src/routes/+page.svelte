<script lang="ts">
  import type { ApexOptions } from "apexcharts";
  import { Chart } from "@flowbite-svelte-plugins/chart";
  import { Card, Button, Label, Input, Alert } from "flowbite-svelte";

  let amount = $state(1);

  let isInvalid = $derived(amount <= 0);

  const increment = () => (amount += 1);
  const decrement = () => (amount = Math.max(0, amount - 1));

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
    margin: 0;
  }
  :global(input[type="number"]) {
    -moz-appearance: textfield;
  }
</style>

<div class="grid grid-cols-3 items-start gap-8 p-8">
  <div class="col-span-2">
    <Chart {options} />
  </div>
  <Card class="h-full p-6">
    <form class="flex h-full flex-col justify-center">
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
