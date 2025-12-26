import { ethers } from "ethers";
import { contractABI } from "$lib/abi";
import {
  buyShares,
  sellShares,
  redeemPayout,
  checkAllowance,
  approveTokens,
  getTransactionCost,
  getChainProvider,
} from "$lib/blockchain";

export const getContractPrice = async (
  contractAddress: string,
  chainId: number,
  assetNames: string[],
  selectedAsset: string,
  amount: number,
  decimals: number,
): Promise<string> => {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      getChainProvider(chainId),
    );
    const outcomeSlotCount = await contract.outcomeSlotCount();
    const deltaOutcomeAmounts = new Array(Number(outcomeSlotCount)).fill(0);
    const assetIndex = assetNames.indexOf(selectedAsset);
    if (assetIndex !== -1) {
      deltaOutcomeAmounts[assetIndex] = ethers.parseUnits(
        amount.toString(),
        decimals,
      );
    }
    const netCost = await contract.calcNetCost(deltaOutcomeAmounts);
    return Math.abs(parseFloat(ethers.formatUnits(netCost, decimals))).toFixed(
      2,
    );
  } catch (error) {
    console.error("Error fetching price from contract:", error);
    return "Error";
  }
};

export const getMarginalPrices = async (
  contractAddress: string,
  chainId: number,
  assetNames: string[],
  decimals: number,
): Promise<number[]> => {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      getChainProvider(chainId),
    );
    const prices = await Promise.all(
      assetNames.map((_: any, i: number) => contract.calcMarginalPrice(i)),
    );
    return prices.map((p: ethers.BigNumberish) =>
      parseFloat(ethers.formatUnits(p, decimals)),
    );
  } catch (error) {
    console.error("Error fetching marginal prices:", error);
    return [];
  }
};

export const getUserShares = async (
  contractAddress: string,
  chainId: number,
  appKit: any,
  assetNames: string[],
  decimals: number,
): Promise<number[]> => {
  if (!appKit) {
    return new Array(assetNames.length).fill(0);
  }
  try {
    const caipAddress = appKit.getCaipAddress();
    if (!caipAddress) {
      return new Array(assetNames.length).fill(0);
    }
    const userAddress = caipAddress.split(":")[2];
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      getChainProvider(chainId),
    );
    const shares = await Promise.all(
      assetNames.map((_: any, i: number) =>
        contract.userShares(userAddress, i),
      ),
    );
    return shares.map((share: ethers.BigNumberish) =>
      parseFloat(ethers.formatUnits(share, decimals)),
    );
  } catch (error) {
    console.error("Error fetching user shares:", error);
    return new Array(assetNames.length).fill(0);
  }
};

export const prepareTransaction = async (
  chainId: number,
  contractAddress: string,
  provider: any,
  assetIndex: number,
  amount: string,
): Promise<string | null> => {
  try {
    const ethersProvider = new ethers.BrowserProvider(provider);
    const cost = await getTransactionCost(
      chainId,
      assetIndex,
      amount,
      ethersProvider,
      contractAddress,
    );
    return cost?.cost ?? null;
  } catch (error) {
    console.error("Error calculating transaction cost:", error);
    return null;
  }
};

export const confirmAndExecuteTransaction = async (
  contractAddress: string,
  provider: any,
  chainId: number,
  appKit: any,
  transactionType: "buy" | "sell",
  transactionCost: string,
  assetIndex: number,
  amount: string,
): Promise<boolean> => {
  const caipAddress = appKit?.getCaipAddress();
  if (!caipAddress) return false;
  const address = caipAddress.split(":")[2];

  try {
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();

    const allowanceInfo = await checkAllowance(
      address,
      ethersProvider,
      contractAddress,
      chainId,
    );
    if (!allowanceInfo) return false;

    const requiredAmount = parseFloat(transactionCost);
    const currentAllowance = parseFloat(allowanceInfo.allowance);

    if (currentAllowance < requiredAmount) {
      const approvalSuccess = await approveTokens(
        address,
        (requiredAmount * 2).toString(),
        signer,
        contractAddress,
        chainId,
      );
      if (!approvalSuccess) return false;
    }

    if (transactionType === "buy") {
      return await buyShares(
        assetIndex,
        amount.toString(),
        signer,
        contractAddress,
      );
    } else {
      return await sellShares(
        assetIndex,
        amount.toString(),
        signer,
        contractAddress,
      );
    }
  } catch (error) {
    console.error(`Error during ${transactionType}:`, error);
    return false;
  }
};

export const redeemTokens = async (
  contractAddress: string,
  provider: any,
): Promise<boolean> => {
  try {
    const signer = await new ethers.BrowserProvider(provider).getSigner();
    return await redeemPayout(signer, contractAddress);
  } catch (error) {
    console.error("Error during redeem:", error);
    return false;
  }
};
