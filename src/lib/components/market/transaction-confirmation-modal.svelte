<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index";
  import { Button } from "$lib/components/ui/button/index";

  export let showConfirmation: boolean;
  export let pendingTransaction: "buy" | "sell" | null;
  export let transactionCost: string | null;
  export let amount: number;
  export let selectedAsset: string;
  export let isBuying: boolean;
  export let isSelling: boolean;
  export let isApproving: boolean;

  export let confirmTransaction: () => void;
</script>

<Dialog.Root bind:open={showConfirmation}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Confirm Transaction</Dialog.Title>
      {#if pendingTransaction && transactionCost}
        <Dialog.Description>
          <div class="space-y-4">
            <div class="text-center">
              <h3 class="text-lg font-semibold">
                {pendingTransaction === "buy" ? "Buy" : "Sell"}
                {amount} shares of {selectedAsset}
              </h3>
              <p class="mt-2 text-2xl font-bold">
                Cost: {transactionCost} tokens
              </p>
            </div>

            <div class="rounded-lg">
              <p class="text-sm">
                This transaction will require token approval if you haven't
                approved enough tokens yet. You may see two transactions: one
                for approval and one for the trade.
              </p>
            </div>
          </div>
        </Dialog.Description>
      {/if}
    </Dialog.Header>
    <Dialog.Footer>
      <Button
        onclick={confirmTransaction}
        disabled={isBuying || isSelling || isApproving}
        color="green"
        class="flex-1"
      >
        {#if isApproving}
          Approving...
        {:else if isBuying}
          Buying...
        {:else if isSelling}
          Selling...
        {:else}
          Confirm
        {/if}
      </Button>
      <Button
        onclick={() => (showConfirmation = false)}
        color="alternative"
        class="flex-1"
        disabled={isBuying || isSelling || isApproving}
      >
        Cancel
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
