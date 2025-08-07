<script lang="ts">
  import { Button } from "$lib/components/ui/button/index";
  import { Alert } from "$lib/components/ui/alert/index";
  import * as Chart from "$lib/components/ui/chart/index";
  import { LineChart } from "layerchart";
  import { getChartColor } from "$lib/theme";

  interface Props {
    loading: boolean;
    error: string | null;
    assetNames: string[];
    dataDates: Date[];
    dataRows: number[][];
  }

  let { loading, error, assetNames, dataDates, dataRows } = $props();

  let combinedMode = $state(false);

  const lineChartConfig: Chart.ChartConfig = $derived(
    Object.fromEntries(
      assetNames.map((name: string, i: number) => [
        name,
        {
          label: name,
          color: getChartColor(i),
        },
      ]),
    ),
  );

  const lineChartData = $derived(
    dataDates.map((date: Date, dateIndex: number) => {
      const entry: Record<string, any> = { date };
      assetNames.forEach((assetName: string, assetIndex: number) => {
        entry[assetName] = dataRows[dateIndex][assetIndex];
      });
      return entry;
    }),
  );
</script>

<div
  class="theme-card theme-border mt-8 rounded-lg p-4 shadow-lg transition-opacity hover:opacity-90 md:p-6"
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
        series={assetNames.map((n: string) => ({
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
