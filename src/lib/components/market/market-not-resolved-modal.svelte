<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index";
  import { Button } from "$lib/components/ui/button/index";

  export let showMarketNotResolved: boolean;
</script>

<Dialog.Root bind:open={showMarketNotResolved}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Market Not Resolved</Dialog.Title>
      <Dialog.Description>
        <div class="space-y-6">
          <div class="text-center">
            <p class="text-sm">
              The market for this dataset on the current chain is not yet
              resolved.
            </p>
          </div>

          <div class="rounded-lg">
            <div class="flex">
              <div class="ml-3">
                <h3 class="text-sm font-medium">What this means:</h3>
                <div class="mt-2 text-sm">
                  <ul class="list-inside list-disc space-y-1">
                    <li>The market outcome has not been determined yet</li>
                    <li>You may need to wait for the market to resolve</li>
                    <li>Ensure you're on the correct chain</li>
                    <li>Check if the market contract is properly deployed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button
        onclick={() => (showMarketNotResolved = false)}
        color="alternative"
        size="sm"
      >
        Close
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
