// 1e18 в BigNumber, adapted for ethers v6 (native BigInt)
export const UNIT_DEC = 1000000000000000000n;

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
