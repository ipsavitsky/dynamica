import { ethers } from 'ethers';
import { contractABI } from './abi';

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

// Mock token contract address
export const MOCK_TOKEN_ADDRESS = "0x74569DcAb17C4de8A0C19272be91b095de0bdd38";

// Market contract address
export const MARKET_CONTRACT_ADDRESS = "0x6d54f93e64c29A0D8FCF01039d1cbC701553c090";

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

export async function getTokenBalance(address: string, provider: ethers.Provider): Promise<{ balance: string; symbol: string } | null> {
  try {
    console.log('Creating contract with address:', MOCK_TOKEN_ADDRESS);
    console.log('User address:', address);
    
    const contract = new ethers.Contract(MOCK_TOKEN_ADDRESS, ERC20_ABI, provider);
    
    console.log('Contract created, fetching balance...');
    
    const [balance, decimals, symbol] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals(),
      contract.symbol()
    ]);
    
    console.log('Raw balance:', balance.toString());
    console.log('Decimals:', decimals.toString());
    console.log('Symbol:', symbol);
    
    const formattedBalance = ethers.formatUnits(balance, decimals);
    console.log('Formatted balance:', formattedBalance);
    
    return {
      balance: parseFloat(formattedBalance).toFixed(2),
      symbol: symbol
    };
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return null;
  }
}

export async function mintTokens(address: string, amount: string, signer: ethers.Signer): Promise<boolean> {
  try {
    console.log('Minting tokens to:', address);
    console.log('Amount:', amount);
    
    const contract = new ethers.Contract(MOCK_TOKEN_ADDRESS, ERC20_ABI, signer);
    
    // Get decimals to properly format the amount
    const decimals = await contract.decimals();
    const mintAmount = ethers.parseUnits(amount, decimals);
    
    console.log('Mint amount (with decimals):', mintAmount.toString());
    
    const tx = await contract.mint(address, mintAmount);
    console.log('Mint transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('Mint transaction confirmed');
    
    return true;
  } catch (error) {
    console.error('Error minting tokens:', error);
    return false;
  }
}

export async function buyShares(assetIndex: number, amount: string, signer: ethers.Signer): Promise<boolean> {
  try {
    console.log('Buying shares for asset index:', assetIndex, 'amount:', amount);
    
    const marketContract = new ethers.Contract(MARKET_CONTRACT_ADDRESS, contractABI, signer);
    
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

export async function sellShares(assetIndex: number, amount: string, signer: ethers.Signer): Promise<boolean> {
  try {
    console.log('Selling shares for asset index:', assetIndex, 'amount:', amount);
    
    const marketContract = new ethers.Contract(MARKET_CONTRACT_ADDRESS, contractABI, signer);
    
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

export async function redeemPayout(signer: ethers.Signer): Promise<boolean> {
  try {
    console.log('Redeeming payout...');
    
    const marketContract = new ethers.Contract(MARKET_CONTRACT_ADDRESS, contractABI, signer);
    
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

export async function checkAllowance(userAddress: string, provider: ethers.Provider): Promise<{ allowance: string; decimals: number } | null> {
  try {
    const tokenContract = new ethers.Contract(MOCK_TOKEN_ADDRESS, ERC20_ABI, provider);
    
    const [allowance, decimals] = await Promise.all([
      tokenContract.allowance(userAddress, MARKET_CONTRACT_ADDRESS),
      tokenContract.decimals()
    ]);
    
    return {
      allowance: ethers.formatUnits(allowance, decimals),
      decimals: Number(decimals)
    };
  } catch (error) {
    console.error('Error checking allowance:', error);
    return null;
  }
}

export async function approveTokens(amount: string, signer: ethers.Signer): Promise<boolean> {
  try {
    console.log('Approving tokens for market contract...');
    
    const tokenContract = new ethers.Contract(MOCK_TOKEN_ADDRESS, ERC20_ABI, signer);
    const decimals = await tokenContract.decimals();
    const approveAmount = ethers.parseUnits(amount, decimals);
    
    console.log('Approve amount:', approveAmount.toString());
    
    const tx = await tokenContract.approve(MARKET_CONTRACT_ADDRESS, approveAmount);
    console.log('Approval transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('Approval transaction confirmed');
    
    return true;
  } catch (error) {
    console.error('Error approving tokens:', error);
    return false;
  }
}

export async function getTransactionCost(assetIndex: number, amount: string, provider: ethers.Provider): Promise<{ cost: string; decimals: number } | null> {
  try {
    const marketContract = new ethers.Contract(MARKET_CONTRACT_ADDRESS, contractABI, provider);
    
    const [unitDec, outcomeSlotCount] = await Promise.all([
      marketContract.UNIT_DEC(),
      marketContract.outcomeSlotCount()
    ]);
    
    const decimals = Math.round(Math.log10(Number(unitDec)));
    
    // Create delta array
    const deltaOutcomeAmounts = new Array(Number(outcomeSlotCount)).fill(0);
    deltaOutcomeAmounts[assetIndex] = ethers.parseUnits(amount, decimals);
    
    const netCost = await marketContract.calcNetCost(deltaOutcomeAmounts);
    const absoluteCost = netCost < 0n ? -netCost : netCost;
    const cost = ethers.formatUnits(absoluteCost, decimals);
    
    return {
      cost: parseFloat(cost).toFixed(4),
      decimals
    };
  } catch (error) {
    console.error('Error calculating transaction cost:', error);
    return null;
  }
}
