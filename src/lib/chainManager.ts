import { writable, derived } from "svelte/store";
import { browser } from "$app/environment";
import {
  getChainConfig,
  getAvailableChains,
  getAvailableMarkets,
  DEFAULT_CHAIN_ID,
} from "./config/index";

export const currentChainId = writable<number>(
  browser
    ? parseInt(
        localStorage.getItem("preferredChainId") || DEFAULT_CHAIN_ID.toString(),
      )
    : DEFAULT_CHAIN_ID,
);
export const currentChain = derived(currentChainId, getChainConfig);
export const availableChains = writable(getAvailableChains());
export const currentMarkets = derived(currentChain, ($chain) =>
  $chain ? getAvailableMarkets($chain.id) : [],
);
export const availableCurrentMarkets = derived(currentMarkets, ($markets) =>
  $markets.filter((m) => m.enabled),
);

export const switchChain = (chainId: number): boolean => {
  if (!getChainConfig(chainId)) return false;
  currentChainId.set(chainId);
  if (browser) localStorage.setItem("preferredChainId", chainId.toString());
  return true;
};
