import { ethers } from 'ethers';
import { contractABI } from './abi';
import { getBaseTokenAddress } from './config/index';

// 1e18 в BigNumber, adapted for ethers v6 (native BigInt)
export const UNIT_DEC = 1000000000000000000n;

// ERC20 ABI for balance, decimals, mint, and allowance
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function mint(address receiver, uint256 amount) external",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

// Collateral token address will be fetched dynamically from market contract
let COLLATERAL_TOKEN_ADDRESS: string | null = null;
let COLLATERAL_TOKEN_LOADING = false;

// Define an interface for the contract to ensure type safety.
export interface Contract {
  getB(q_s: bigint[]): Promise<bigint>;
  ln(val: bigint): Promise<bigint>;
}

export async function getDeltaJS(
  q0: string | number,
  q1: string | number,
  targetWad: string | number,
  first: boolean,
  contract: Contract,
): Promise<bigint> {
  // 1) Переводим q0, q1 в WAD (умножая на 1e18)
  const q0Wad = BigInt(q0) * UNIT_DEC;
  const q1Wad = BigInt(q1) * UNIT_DEC;

  // 2) Получаем b = getB([q0Wad, q1Wad])
  const b = await contract.getB([q0Wad, q1Wad]);

  if (b === 0n) {
    throw new Error("b is zero");
  }

  // 3) Считаем ratio = target / (1 - target)
  const target = BigInt(targetWad);
  const one = UNIT_DEC;
  const ratio = (target * one) / (one - target);

  // 4) lnRatio = ln(ratio)
  const lnRatio = await contract.ln(ratio);

  // 5) raw = b * lnRatio / UNIT_DEC
  const raw = (BigInt(b) * BigInt(lnRatio)) / UNIT_DEC;

  // 6) final delta q:
  const q0BN = BigInt(q0);
  const q1BN = BigInt(q1);
  const adjustment = first ? q1BN - q0BN : q0BN - q1BN;

  // NOTE: The original logic had a potential issue mixing scaled and unscaled numbers.
  // The adjustment has been scaled to WAD for correct calculation.
  const delta = raw + adjustment * UNIT_DEC;
  return delta;
}

// Function to get a reliable JSON RPC provider for contract calls
export function getContractProvider(): ethers.JsonRpcProvider {
  const tatumApiKey = import.meta.env.VITE_TATUM_API_KEY;
  
  // For now, default to Coston2. In the future, this should be chain-aware
  const rpcUrl = tatumApiKey 
    ? `https://coston2-api.flare.network/ext/C/rpc?x-apikey=${tatumApiKey}`
    : "https://coston2-api.flare.network/ext/C/rpc";
  
  return new ethers.JsonRpcProvider(rpcUrl, 114, {
    staticNetwork: ethers.Network.from(114)
  });
}

// Function to get a provider for a specific chain
export function getChainProvider(chainId: number): ethers.JsonRpcProvider {
  const tatumApiKey = import.meta.env.VITE_TATUM_API_KEY;
  
  switch (chainId) {
    case 114: // Coston2 Testnet
      const coston2Url = tatumApiKey 
        ? `https://coston2-api.flare.network/ext/C/rpc?x-apikey=${tatumApiKey}`
        : "https://coston2-api.flare.network/ext/C/rpc";
      return new ethers.JsonRpcProvider(coston2Url, 114, {
        staticNetwork: ethers.Network.from(114)
      });
    
    case 296: // Hedera Testnet
      const hederaUrl = "https://testnet.hashio.io/api";
      return new ethers.JsonRpcProvider(hederaUrl, 296, {
        staticNetwork: ethers.Network.from(296)
      });
    
    case 545: // Flow EVM Testnet
      const flowUrl = "https://testnet.evm.nodes.onflow.org";
      return new ethers.JsonRpcProvider(flowUrl, 545, {
        staticNetwork: ethers.Network.from(545)
      });
    
    default:
      // Fallback to Coston2
      const fallbackUrl = tatumApiKey 
        ? `https://coston2-api.flare.network/ext/C/rpc?x-apikey=${tatumApiKey}`
        : "https://coston2-api.flare.network/ext/C/rpc";
      return new ethers.JsonRpcProvider(fallbackUrl, 114, {
        staticNetwork: ethers.Network.from(114)
      });
  }
}

// Retry mechanism for contract calls
async function retryContractCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Contract call attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}

// Function to get collateral token address from market contract
async function getCollateralTokenAddress(chainId?: number): Promise<string | null> {
  // Get the base token address for the specific chain
  const configTokenAddress = getBaseTokenAddress(chainId);
  console.log('Using base token address from config for chain', chainId, ':', configTokenAddress);
  COLLATERAL_TOKEN_ADDRESS = configTokenAddress;
  return COLLATERAL_TOKEN_ADDRESS;
}

// Function to get token balance
export async function getTokenBalance(address: string, chainId?: number, provider?: ethers.Provider): Promise<{ balance: string; symbol: string } | null> {
  try {
    const tokenAddress = await getCollateralTokenAddress(chainId);
    if (!tokenAddress) {
      console.warn('Could not get collateral token address');
      return {
        balance: '0.0',
        symbol: 'MOCK'
      };
    }
    
    console.log('Creating contract with address:', tokenAddress);
    console.log('User address:', address);
    console.log('Chain ID:', chainId);
    
    // Use chain-aware provider for contract calls
    const contractProvider = provider || (chainId ? getChainProvider(chainId) : getContractProvider());
    
    // First check if contract exists by getting its bytecode
    const code = await contractProvider.getCode(tokenAddress);
    if (code === '0x') {
      console.warn('No contract found at address:', tokenAddress);
      // Return mock data for development
      return {
        balance: '0.0',
        symbol: 'MOCK'
      };
    }
    
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, contractProvider);
    
    console.log('Contract created, fetching balance...');
    
    // Try to get contract info with individual calls for better error handling
    let balance, decimals, symbol;
    
    try {
      balance = await contract.balanceOf(address);
      console.log('Raw balance:', balance.toString());
    } catch (error) {
      console.error('Failed to get balance:', error);
      balance = 0n;
    }
    
    try {
      decimals = await contract.decimals();
      console.log('Decimals:', decimals);
    } catch (error) {
      console.error('Failed to get decimals:', error);
      decimals = 18; // Default to 18 decimals
    }
    
    try {
      symbol = await contract.symbol();
      console.log('Symbol:', symbol);
    } catch (error) {
      console.error('Failed to get symbol:', error);
      symbol = 'MOCK'; // Default symbol
    }
    
    const formattedBalance = ethers.formatUnits(balance, decimals);
    console.log('Formatted balance:', formattedBalance);
    
    return {
      balance: formattedBalance,
      symbol: symbol
    };
  } catch (error) {
    console.error('Failed to fetch token balance:', error);
    // Return mock data as fallback
    return {
      balance: '0.0',
      symbol: 'MOCK'
    };
  }
}

export async function mintTokens(address: string, amount: string, signer: ethers.Signer, chainId?: number): Promise<boolean> {
  try {
    console.log('Minting tokens to:', address);
    console.log('Amount:', amount);
    
    // Check if contract exists first
    const provider = signer.provider;
    if (!provider) {
      console.error('No provider available');
      return false;
    }
    
    const tokenAddress = await getCollateralTokenAddress(chainId);
    if (!tokenAddress) {
      console.warn('Could not get collateral token address');
      console.log('Mock mint operation - tokens not actually minted');
      return true; // Return true to not break the UI flow
    }
    
    const code = await provider.getCode(tokenAddress);
    if (code === '0x') {
      console.warn('No contract found at address:', tokenAddress);
      console.log('Mock mint operation - tokens not actually minted');
      return true; // Return true to not break the UI flow
    }
    
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    
    // Get decimals to properly format the amount
    let decimals;
    try {
      decimals = await contract.decimals();
    } catch (error) {
      console.error('Failed to get decimals, using default 18:', error);
      decimals = 18;
    }
    
    const mintAmount = ethers.parseUnits(amount, decimals);
    
    console.log('Mint amount (with decimals):', mintAmount.toString());
    
    const tx = await contract.mint(address, mintAmount);
    console.log('Mint transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('Mint transaction confirmed');
    
    return true;
  } catch (error) {
    console.error('Failed to mint tokens:', error);
    return false;
  }
}

export async function buyShares(assetIndex: number, amount: string, signer: ethers.Signer, marketAddress: string): Promise<boolean> {
  try {
    console.log('Buying shares for asset index:', assetIndex, 'amount:', amount);
    
    const marketContract = new ethers.Contract(marketAddress, contractABI, signer);
    
    // Get the unit decimals and outcome slot count
    const [unitDec, outcomeSlotCount] = await Promise.all([
      marketContract.UNIT_DEC(),
      marketContract.outcomeSlotCount()
    ]);
    
    const decimals = Math.round(Math.log10(Number(unitDec)));
    console.log('Using decimals:', decimals);
    
    // Create delta array with the amount for the selected asset
    const deltaOutcomeAmounts = new Array(Number(outcomeSlotCount)).fill(0);
    deltaOutcomeAmounts[assetIndex] = ethers.parseUnits(amount, decimals);
    
    console.log('Delta outcome amounts:', deltaOutcomeAmounts);
    
    // Calculate the cost first
    const netCost = await marketContract.calcNetCost(deltaOutcomeAmounts);
    console.log('Net cost:', ethers.formatUnits(netCost, decimals));
    
    // Execute the trade
    const tx = await marketContract.makePrediction(deltaOutcomeAmounts);
    console.log('Buy transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('Buy transaction confirmed');
    
    return true;
  } catch (error) {
    console.error('Error buying shares:', error);
    return false;
  }
}

export async function sellShares(assetIndex: number, amount: string, signer: ethers.Signer, marketAddress: string): Promise<boolean> {
  try {
    console.log('Selling shares for asset index:', assetIndex, 'amount:', amount);
    
    const marketContract = new ethers.Contract(marketAddress, contractABI, signer);
    
    // Get the unit decimals and outcome slot count
    const [unitDec, outcomeSlotCount] = await Promise.all([
      marketContract.UNIT_DEC(),
      marketContract.outcomeSlotCount()
    ]);
    
    const decimals = Math.round(Math.log10(Number(unitDec)));
    console.log('Using decimals:', decimals);
    
    // Create delta array with negative amount for the selected asset (selling)
    const deltaOutcomeAmounts = new Array(Number(outcomeSlotCount)).fill(0);
    deltaOutcomeAmounts[assetIndex] = -ethers.parseUnits(amount, decimals);
    
    console.log('Delta outcome amounts:', deltaOutcomeAmounts);
    
    // Calculate the cost first
    const netCost = await marketContract.calcNetCost(deltaOutcomeAmounts);
    console.log('Net cost:', ethers.formatUnits(netCost, decimals));
    
    // Execute the trade
    const tx = await marketContract.makePrediction(deltaOutcomeAmounts);
    console.log('Sell transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('Sell transaction confirmed');
    
    return true;
  } catch (error) {
    console.error('Error selling shares:', error);
    return false;
  }
}

export async function redeemPayout(signer: ethers.Signer, marketAddress: string): Promise<boolean> {
  try {
    console.log('Redeeming payout...');
    
    const marketContract = new ethers.Contract(marketAddress, contractABI, signer);
    
    const tx = await marketContract.redeemPayout();
    console.log('Redeem transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('Redeem transaction confirmed');
    
    return true;
  } catch (error) {
    console.error('Error redeeming payout:', error);
    return false;
  }
}

export async function checkAllowance(userAddress: string, provider?: ethers.Provider, marketAddress?: string, chainId?: number): Promise<{ allowance: string; decimals: number } | null> {
  try {
    const tokenAddress = await getCollateralTokenAddress(chainId);
    if (!tokenAddress) {
      console.warn('Could not get collateral token address');
      return {
        allowance: '0.0',
        decimals: 18
      };
    }
    
    // Use dedicated provider for contract calls
    const contractProvider = provider || getContractProvider();
    
    // Check if contract exists first
    const code = await contractProvider.getCode(tokenAddress);
    if (code === '0x') {
      console.warn('No contract found at address:', tokenAddress);
      return {
        allowance: '0.0',
        decimals: 18
      };
    }
    
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, contractProvider);
    
    let allowance, decimals;
    
    try {
      // Check allowance for the market contract, not the token contract itself
      const spenderAddress = marketAddress || tokenAddress; // Fallback to token address if no market address provided
      allowance = await tokenContract.allowance(userAddress, spenderAddress);
    } catch (error) {
      console.error('Failed to get allowance:', error);
      allowance = 0n;
    }
    
    try {
      decimals = await tokenContract.decimals();
    } catch (error) {
      console.error('Failed to get decimals:', error);
      decimals = 18;
    }
    
    return {
      allowance: ethers.formatUnits(allowance, decimals),
      decimals: Number(decimals)
    };
  } catch (error) {
    console.error('Failed to check allowance:', error);
    return null;
  }
}

export async function approveTokens(address: string, amount: string, signer: ethers.Signer, marketAddress?: string, chainId?: number): Promise<boolean> {
  try {
    console.log('Approving tokens for market contract...');
    
    // Check if contract exists first
    const provider = signer.provider;
    if (!provider) {
      console.error('No provider available');
      return false;
    }
    
    const tokenAddress = await getCollateralTokenAddress(chainId);
    if (!tokenAddress) {
      console.warn('Could not get collateral token address');
      console.log('Mock approve operation - tokens not actually approved');
      return true; // Return true to not break the UI flow
    }
    
    const code = await provider.getCode(tokenAddress);
    if (code === '0x') {
      console.warn('No contract found at address:', tokenAddress);
      console.log('Mock approve operation - tokens not actually approved');
      return true; // Return true to not break the UI flow
    }
    
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    
    let decimals;
    try {
      decimals = await tokenContract.decimals();
    } catch (error) {
      console.error('Failed to get decimals, using default 18:', error);
      decimals = 18;
    }
    
    const approveAmount = ethers.parseUnits(amount, decimals);
    
    // Approve the market contract to spend tokens, not the token contract itself
    const spenderAddress = marketAddress || tokenAddress; // Fallback to token address if no market address provided
    const tx = await tokenContract.approve(spenderAddress, approveAmount);
    console.log('Approve transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('Approve transaction confirmed');
    
    return true;
  } catch (error) {
    console.error('Error approving tokens:', error);
    return false;
  }
}

export async function getTransactionCost(assetIndex: number, amount: string, provider: ethers.Provider, marketAddress: string): Promise<{ cost: string; decimals: number } | null> {
  try {
    const marketContract = new ethers.Contract(marketAddress, contractABI, provider);
    
    // Get the unit decimals and outcome slot count
    const [unitDec, outcomeSlotCount] = await Promise.all([
      marketContract.UNIT_DEC(),
      marketContract.outcomeSlotCount()
    ]);
    
    const decimals = Math.round(Math.log10(Number(unitDec)));
    
    // Create delta array with the amount for the selected asset
    const deltaOutcomeAmounts = new Array(Number(outcomeSlotCount)).fill(0);
    deltaOutcomeAmounts[assetIndex] = ethers.parseUnits(amount, decimals);
    
    // Calculate the cost
    const netCost = await marketContract.calcNetCost(deltaOutcomeAmounts);
    const cost = ethers.formatUnits(netCost, decimals);
    
    return {
      cost: Math.abs(parseFloat(cost)).toFixed(6),
      decimals: decimals
    };
  } catch (error) {
    console.error('Error calculating transaction cost:', error);
    return null;
  }
}
