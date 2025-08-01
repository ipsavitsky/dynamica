import {
  getChainConfig,
  getAvailableChains,
  getAvailableMarkets,
  DEFAULT_CHAIN_ID,
} from "./config/index";

export const currentChainId = DEFAULT_CHAIN_ID;
export const currentChain = getChainConfig(DEFAULT_CHAIN_ID);
export const availableChains = getAvailableChains();
export const currentMarkets = getAvailableMarkets(DEFAULT_CHAIN_ID);
export const availableCurrentMarkets = getAvailableMarkets(DEFAULT_CHAIN_ID);
