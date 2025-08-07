<script lang="ts">
  import { browser } from "$app/environment";
  import * as Card from "$lib/components/ui/card/index";
  import { Button } from "$lib/components/ui/button/index";
  import { Input } from "$lib/components/ui/input/index";
  import { Label } from "$lib/components/ui/label/index";
  import * as Select from "$lib/components/ui/select/index";
  import { Alert } from "$lib/components/ui/alert/index";

  interface Props {
    price: string;
    pricePerShare: string;
    selectedAsset?: string;
    amount?: number;
    isInvalid: boolean;
    isBuying: boolean;
    isSelling: boolean;
    isRedeeming: boolean;
    assetNames: string[];
    contractAddress: string | null;
    handleBuy: () => void;
    handleSell: () => void;
    handleRedeem: () => void;
    decrement: () => void;
    increment: () => void;
    getContractPrice: () => void;
  }

  let {
    price,
    pricePerShare,
    selectedAsset = $bindable(),
    amount = $bindable(),
    isInvalid,
    isBuying,
    isSelling,
    isRedeeming,
    assetNames,
    contractAddress,
    handleBuy,
    handleSell,
    handleRedeem,
    decrement,
    increment,
    getContractPrice,
  } = $props();

  const selectItems = $derived(
    assetNames.map((name: string) => ({ name, value: name })),
  );

  // Immediate debounce helper for direct UI actions
  let _immediateDebounce: ReturnType<typeof setTimeout> | null = null;
  const immediateDebounce = (fn: () => void, delay = 200) => {
    if (_immediateDebounce) clearTimeout(_immediateDebounce);
    _immediateDebounce = setTimeout(fn, delay);
  };
</script>

<Card.Root
  class="theme-card theme-border order-2 h-full p-4 shadow-lg transition-opacity hover:opacity-90 md:order-1 md:col-span-1 md:p-6"
>
  <Card.Content>
    <form class="flex h-full flex-col justify-center">
      <div class="mb-4 flex items-end justify-start gap-4">
        <p class="theme-text text-3xl font-semibold md:text-4xl">
          ${price}
        </p>
        <div class="theme-text-secondary text-xs font-normal md:text-sm">
          <p>
            ${pricePerShare}
          </p>
          <p>per share</p>
        </div>
      </div>
      <div class="theme-text mb-4 space-y-2">
        <Label for="assetSelection">Assets</Label>
        <div id="assetSelection">
          {#if browser}
            <Select.Root type="single" bind:value={selectedAsset}>
              <Select.Trigger
                class="theme-card theme-border theme-text w-full text-left"
              >
                {selectedAsset !== undefined ? selectedAsset : "Select Outcome"}
              </Select.Trigger>
              <Select.Content>
                {#each selectItems as item}
                  <Select.Item value={item.value}>{item.name}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          {/if}
        </div>
      </div>
      <div class="theme-text mb-4 space-y-2">
        <Label for="amountInput">Shares</Label>
        <div id="amountInput" class="flex w-full items-center space-x-2">
          <Input
            class="h-11"
            bind:value={amount}
            type="number"
            name="amount"
            required
            oninput={() => {
              if (!contractAddress) return;
              if (!selectedAsset) return;
              if (amount == null || Number(amount) <= 0) return;
              immediateDebounce(() => {
                getContractPrice(); // updates price based on current amount
              }, 200);
            }}
          />
          <Button onclick={decrement} type="button" color="light">-1</Button>
          <Button onclick={increment} type="button" color="light">+1</Button>
        </div>
        {#if isInvalid}
          <Alert>Share amount must be a positive number.</Alert>
        {/if}
      </div>
      <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          onclick={handleBuy}
          size="lg"
          class="w-full"
          disabled={isInvalid || isBuying}
          >{isBuying ? "Buying..." : "Buy"}</Button
        >
        <Button
          onclick={handleSell}
          size="lg"
          class="w-full"
          disabled={isInvalid || isSelling}
          >{isSelling ? "Selling..." : "Sell"}</Button
        >
      </div>
      <Button
        onclick={handleRedeem}
        size="lg"
        class="w-full"
        disabled={isRedeeming}>{isRedeeming ? "Redeeming..." : "Redeem"}</Button
      >
    </form>
  </Card.Content>
</Card.Root>
