<script lang="ts">
  import { Card, A } from 'flowbite-svelte';
</script>

<div class="min-h-screen theme-surface transition-colors duration-300">
  <div class="container mx-auto p-8">
    <h1 class="mb-8 text-center text-4xl font-bold theme-text">Select a Market</h1>
    <div class="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
      <Card href="/market/drivers" class="flex flex-col items-center justify-center p-6 text-center theme-card theme-border shadow-lg hover:opacity-90 transition-opacity">
        <h5 class="mb-2 text-2xl font-bold tracking-tight theme-text">Racing Drivers Market</h5>
        <p class="font-normal theme-text-secondary">
          View the market data for professional racing drivers.
        </p>
      </Card>
      <Card href="/market/crypto" class="flex flex-col items-center justify-center p-6 text-center theme-card theme-border shadow-lg hover:opacity-90 transition-opacity">
        <h5 class="mb-2 text-2xl font-bold tracking-tight theme-text">Cryptocurrency Market</h5>
        <p class="font-normal theme-text-secondary">
          View the market data for popular cryptocurrencies.
        </p>
      </Card>
    </div>
  </div>
</div>
