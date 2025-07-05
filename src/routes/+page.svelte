<script lang="ts">
  import { Card, A } from 'flowbite-svelte';
</script>

<div class="container mx-auto p-8">
  <h1 class="mb-8 text-center text-4xl font-bold">Select a Market</h1>
  <div class="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
    <Card href="/market/driverPoints" class="flex flex-col items-center justify-center p-6 text-center">
      <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Racing Drivers Market</h5>
      <p class="font-normal text-gray-700 dark:text-gray-400">
        View the market data for professional racing drivers.
      </p>
    </Card>
    <Card href="/market/cryptoPrices" class="flex flex-col items-center justify-center p-6 text-center">
      <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Cryptocurrency Market</h5>
      <p class="font-normal text-gray-700 dark:text-gray-400">
        View the market data for popular cryptocurrencies.
      </p>
    </Card>
  </div>
</div>
