<script lang="ts">
  import { Alert } from "$lib/components/ui/alert/index";
  import * as Chart from "$lib/components/ui/chart/index";
  import { BarChart } from "layerchart";
  import { scaleBand } from "d3-scale";

  interface Props {
    loading: boolean;
    error: string | null;
    assetNames: string[];
    currentAllocationData: number[];
    marginalPrices: number[];
  }

  let { loading, error, assetNames, currentAllocationData, marginalPrices } =
    $props();

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
    assetNames.map((name: string, i: number) => ({
      name: name,
      percentage: currentAllocationData[i],
      marginal: marginalPrices[i],
    })),
  );
</script>

<div class="order-1 md:col-span-2">
  {#if loading}
    <p class="theme-text">Loading chart...</p>
  {:else if error}
    <Alert color="red">{error}</Alert>
  {:else}
    <Chart.Container
      class="h-[300px] w-full md:h-[400px]"
      config={barChartConfig}
    >
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
