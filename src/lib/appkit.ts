import { browser } from "$app/environment";
import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { defineChain } from "@reown/appkit/networks";
import { getAvailableChains, getDefaultChainConfig } from "./config/index";

let appKit: ReturnType<typeof createAppKit> | undefined;

const createReownChain = (config: any) =>
  defineChain({
    id: config.id,
    caipNetworkId: `eip155:${config.id}`,
    chainNamespace: "eip155",
    name: config.name,
    nativeCurrency: config.nativeCurrency,
    rpcUrls: { default: { http: config.rpcUrls.default.http } },
    blockExplorers: config.blockExplorers
      ? { default: config.blockExplorers.default }
      : undefined,
  });

export const initializeAppKit = () => {
  if (appKit || !browser) return appKit;

  const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;
  if (!projectId) throw new Error("VITE_REOWN_PROJECT_ID is not set");

  const chains = getAvailableChains().map(createReownChain);
  if (!chains.length) throw new Error("No chains configured");

  appKit = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [chains[0], ...chains.slice(1)],
    defaultNetwork: createReownChain(getDefaultChainConfig()),
    projectId,
    metadata: {
      name: "Market DApp",
      description: "A decentralized market application",
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.png`],
    },
    features: { connectMethodsOrder: ["wallet"] },
  });

  return appKit;
};
