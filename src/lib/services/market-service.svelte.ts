import { ethers } from "ethers";
import { dataService } from "$lib/api";
import { contractABI } from "$lib/abi";
import { getChainProvider } from "$lib/blockchain";
import { initializeAppKit } from "$lib/appkit";
import { browser } from "$app/environment";
import { getMarketAddress, getMarketConfig } from "$lib/config/index";
import { currentChain } from "$lib/chainManager";
import * as blockchainService from "./blockchain-service";

export class MarketService {
  // --- Reactive State ---
  assetNames = $state<string[]>([]);
  dataRows = $state<number[][]>([]);
  dataDates = $state<Date[]>([]);
  currentAllocationData = $state<number[]>([]);
  loading = $state(true);
  error = $state<string | null>(null);
  marginalPrices = $state<number[]>([]);
  userShares = $state<number[]>([]);
  selectedAsset = $state("");
  amount = $state(1);
  decimals = $state(18);
  isBuying = $state(false);
  isSelling = $state(false);
  isRedeeming = $state(false);
  isApproving = $state(false);
  transactionCost = $state<string | null>(null);
  showConfirmation = $state(false);
  pendingTransaction = $state<"buy" | "sell" | null>(null);
  showMarketNotResolved = $state(false);
  price = $state("...");

  // --- Non-reactive properties ---
  contractAddress: string | null;
  marketConfig: any;
  appKit: any;
  dataset: string;
  chainId: number;

  // --- Derived State ---
  get isInvalid() {
    return this.amount <= 0;
  }

  get pricePerShare() {
    return !this.isInvalid && this.price !== "..." && this.price !== "Error"
      ? (parseFloat(this.price) / this.amount).toFixed(2)
      : "0.00";
  }

  constructor(dataset: string, chainId: number) {
    this.dataset = dataset;
    this.chainId = chainId;
    this.contractAddress = getMarketAddress(this.chainId, this.dataset);
    this.marketConfig = getMarketConfig(this.chainId, this.dataset);
    this.appKit = browser ? initializeAppKit() : null;
  }

  getProvider() {
    return window.ethereum || this.appKit?.getProvider?.("eip155");
  }

  async loadMarketData() {
    this.loading = true;
    this.error = null;
    try {
      const chain = currentChain;
      if (!this.marketConfig?.enabled) {
        throw new Error(
          `Market "${this.dataset}" is not available on ${chain?.name || "this chain"}.`,
        );
      }

      const data =
        this.dataset === "drivers"
          ? await dataService.getDriverData()
          : await dataService.getCryptoData();

      this.assetNames = data.headers;
      this.dataRows = data.rows;
      this.dataDates = data.dates || [];
      this.marginalPrices = new Array(this.assetNames.length).fill(0);
      this.userShares = new Array(this.assetNames.length).fill(0);
      if (data.rows.length > 0) {
        this.currentAllocationData = data.rows[data.rows.length - 1];
      }
      this.selectedAsset = this.assetNames[0] || "";

      if (this.contractAddress) {
        const contract = new ethers.Contract(
          this.contractAddress,
          contractABI,
          getChainProvider(this.chainId),
        );
        const unitDec = await contract.UNIT_DEC();
        this.decimals = Math.round(Math.log10(Number(unitDec)));
        await this.updateAllChainData();
      }
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.loading = false;
    }
  }

  async updateAllChainData() {
    await Promise.all([
      this.getContractPrice(),
      this.getMarginalPrices(),
      this.getUserShares(),
    ]);
  }

  async getContractPrice() {
    if (this.isInvalid || !this.contractAddress) {
      this.price = this.isInvalid ? "0.00" : "Error";
      return;
    }
    this.price = await blockchainService.getContractPrice(
      this.contractAddress,
      this.chainId,
      this.assetNames,
      this.selectedAsset,
      this.amount,
      this.decimals,
    );
  }

  async getMarginalPrices() {
    if (!this.contractAddress) return;
    this.marginalPrices = await blockchainService.getMarginalPrices(
      this.contractAddress,
      this.chainId,
      this.assetNames,
      this.decimals,
    );
  }

  async getUserShares() {
    if (!this.appKit || !this.contractAddress) {
      this.userShares = new Array(this.assetNames.length).fill(0);
      return;
    }
    this.userShares = await blockchainService.getUserShares(
      this.contractAddress,
      this.chainId,
      this.appKit,
      this.assetNames,
      this.decimals,
    );
  }

  async handleTransaction(type: "buy" | "sell") {
    if (!this.appKit || this.isInvalid || !this.contractAddress) return;
    const provider = this.getProvider();
    if (!provider) return;
    const assetIndex = this.assetNames.indexOf(this.selectedAsset);
    if (assetIndex === -1) return;

    const cost = await blockchainService.prepareTransaction(
      this.chainId,
      this.contractAddress,
      provider,
      assetIndex,
      this.amount.toString(),
    );

    if (cost) {
      this.transactionCost = cost;
      this.pendingTransaction = type;
      this.showConfirmation = true;
    }
  }

  async confirmTransaction() {
    if (
      !this.pendingTransaction ||
      !this.transactionCost ||
      !this.contractAddress
    )
      return;

    const provider = this.getProvider();
    if (!provider) return;

    this.isApproving = true;
    this.isBuying = this.pendingTransaction === "buy";
    this.isSelling = this.pendingTransaction === "sell";

    const success = await blockchainService.confirmAndExecuteTransaction(
      this.contractAddress,
      provider,
      this.chainId,
      this.appKit,
      this.pendingTransaction,
      this.transactionCost,
      this.assetNames.indexOf(this.selectedAsset),
      this.amount.toString(),
    );

    if (success) {
      await this.updateAllChainData();
    }

    this.showConfirmation = false;
    this.pendingTransaction = null;
    this.transactionCost = null;
    this.isBuying = false;
    this.isSelling = false;
    this.isApproving = false;
  }

  async handleRedeem() {
    if (!this.appKit || this.isRedeeming || !this.contractAddress) return;
    this.isRedeeming = true;

    const provider = this.getProvider();
    if (!provider) {
      this.isRedeeming = false;
      return;
    }
    const caipAddress = this.appKit.getCaipAddress();
    if (!caipAddress) {
      await this.appKit.open();
      this.isRedeeming = false;
      return;
    }

    const success = await blockchainService.redeemTokens(
      this.contractAddress,
      provider,
    );

    if (success) {
      await this.updateAllChainData();
    } else {
      this.showMarketNotResolved = true;
    }

    this.isRedeeming = false;
  }

  decrement() {
    if (this.amount > 1) {
      this.amount -= 1;
      this.getContractPrice();
    }
  }

  increment() {
    this.amount += 1;
    this.getContractPrice();
  }

  async handleBuy() {
    await this.handleTransaction("buy");
  }

  async handleSell() {
    await this.handleTransaction("sell");
  }
}
