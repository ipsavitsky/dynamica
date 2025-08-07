import { ethers } from "ethers";
import { contractABI } from "./abi";
import { getBaseTokenAddress, getChainConfig } from "./config/index";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function mint(address receiver, uint256 amount) external",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

export const getChainProvider = (chainId: number): ethers.JsonRpcProvider => {
  const config = getChainConfig(chainId);
  const rpcUrl =
    config?.rpcUrls.default.http[0] ||
    "https://coston2-api.flare.network/ext/C/rpc";
  return new ethers.JsonRpcProvider(rpcUrl, chainId, {
    staticNetwork: ethers.Network.from(chainId),
  });
};

const createTokenContract = async (
  chainId?: number,
  provider?: ethers.Provider,
) => {
  const tokenAddress = getBaseTokenAddress(chainId);
  const contractProvider = provider || getChainProvider(chainId || 545);
  const code = await contractProvider.getCode(tokenAddress);
  if (code === "0x") return null;
  return new ethers.Contract(tokenAddress, ERC20_ABI, contractProvider);
};

export const getTokenBalance = async (
  address: string,
  chainId?: number,
  provider?: ethers.Provider,
) => {
  try {
    const contract = await createTokenContract(chainId, provider);
    if (!contract) return { balance: "0.0", symbol: "MOCK" };

    const [balance, decimals, symbol] = await Promise.all([
      contract.balanceOf(address).catch(() => 0n),
      contract.decimals().catch(() => 18),
      contract.symbol().catch(() => "MOCK"),
    ]);

    return { balance: ethers.formatUnits(balance, decimals), symbol };
  } catch (error) {
    console.error("Failed to fetch token balance:", error);
    return { balance: "0.0", symbol: "MOCK" };
  }
};

export const mintTokens = async (
  address: string,
  amount: string,
  signer: ethers.Signer,
  chainId?: number,
): Promise<boolean> => {
  try {
    const tokenAddress = getBaseTokenAddress(chainId);
    const code = await signer.provider?.getCode(tokenAddress);
    if (code === "0x") return true;

    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const decimals = await contract.decimals().catch(() => 18);
    const tx = await contract.mint(
      address,
      ethers.parseUnits(amount, decimals),
    );
    await tx.wait();
    return true;
  } catch (error) {
    console.error("Failed to mint tokens:", error);
    return false;
  }
};

const executeMarketTransaction = async (
  assetIndex: number,
  amount: string,
  signer: ethers.Signer,
  marketAddress: string,
  isSell = false,
): Promise<boolean> => {
  try {
    const contract = new ethers.Contract(marketAddress, contractABI, signer);
    const [unitDec, outcomeSlotCount] = await Promise.all([
      contract.UNIT_DEC(),
      contract.outcomeSlotCount(),
    ]);
    const decimals = await contract.decimals();

    const deltaOutcomeAmounts = new Array(Number(outcomeSlotCount)).fill(0);
    deltaOutcomeAmounts[assetIndex] =
      ethers.parseUnits(amount, decimals) * (isSell ? -1n : 1n);

    const tx = await contract.makePrediction(deltaOutcomeAmounts);
    await tx.wait();
    return true;
  } catch (error) {
    console.error(`Error ${isSell ? "selling" : "buying"} shares:`, error);
    return false;
  }
};

export const buyShares = (
  assetIndex: number,
  amount: string,
  signer: ethers.Signer,
  marketAddress: string,
) => executeMarketTransaction(assetIndex, amount, signer, marketAddress, false);
export const sellShares = (
  assetIndex: number,
  amount: string,
  signer: ethers.Signer,
  marketAddress: string,
) => executeMarketTransaction(assetIndex, amount, signer, marketAddress, true);

export const redeemPayout = async (
  signer: ethers.Signer,
  marketAddress: string,
): Promise<boolean> => {
  try {
    const contract = new ethers.Contract(marketAddress, contractABI, signer);
    const tx = await contract.redeemPayout();
    await tx.wait();
    return true;
  } catch (error) {
    console.error("Error redeeming payout:", error);
    return false;
  }
};

export const checkAllowance = async (
  userAddress: string,
  provider?: ethers.Provider,
  marketAddress?: string,
  chainId?: number,
) => {
  try {
    const contract = await createTokenContract(chainId, provider);
    if (!contract) return { allowance: "0.0", decimals: 18 };

    const [allowance, decimals] = await Promise.all([
      contract
        .allowance(userAddress, marketAddress || getBaseTokenAddress(chainId))
        .catch(() => 0n),
      contract.decimals().catch(() => 18),
    ]);

    return {
      allowance: ethers.formatUnits(allowance, decimals),
      decimals: Number(decimals),
    };
  } catch (error) {
    console.error("Failed to check allowance:", error);
    return null;
  }
};

export const approveTokens = async (
  address: string,
  amount: string,
  signer: ethers.Signer,
  marketAddress?: string,
  chainId?: number,
): Promise<boolean> => {
  try {
    const tokenAddress = getBaseTokenAddress(chainId);
    const code = await signer.provider?.getCode(tokenAddress);
    if (code === "0x") return true;

    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const decimals = await contract.decimals().catch(() => 18);
    const tx = await contract.approve(
      marketAddress || tokenAddress,
      ethers.parseUnits(amount, decimals),
    );
    await tx.wait();
    return true;
  } catch (error) {
    console.error("Error approving tokens:", error);
    return false;
  }
};

export const getTransactionCost = async (
  chainId: number,
  assetIndex: number,
  amount: string,
  provider: ethers.Provider,
  marketAddress: string,
) => {
  try {
    const tokenAddress = getBaseTokenAddress(chainId);
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider,
    );
    const tokenDecimals = await tokenContract.decimals().catch(() => 18);
    const contract = new ethers.Contract(marketAddress, contractABI, provider);
    const [unitDec, outcomeSlotCount] = await Promise.all([
      contract.UNIT_DEC(),
      contract.outcomeSlotCount(),
    ]);
    const decimals = await contract.decimals();

    const deltaOutcomeAmounts = new Array(Number(outcomeSlotCount)).fill(0);
    deltaOutcomeAmounts[assetIndex] = ethers.parseUnits(amount, decimals);

    const netCost = await contract.calcNetCost(deltaOutcomeAmounts);
    return {
      cost: Math.abs(
        parseFloat(ethers.formatUnits(netCost, tokenDecimals)),
      ).toFixed(6),
      tokenDecimals,
    };
  } catch (error) {
    console.error("Error calculating transaction cost:", error);
    return null;
  }
};
