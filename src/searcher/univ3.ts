import { ethers } from "ethers";
import QuoterV2 from "./abi/QuoterV2.json";
import { CONFIG } from "./config";

export type Pool = { name: string; address: string; token0: string; token1: string; fee: number; };

export function makeProvider() { return new ethers.JsonRpcProvider(CONFIG.rpcUrl); }

export function tokenAddress(symbol: string): string {
  // @ts-ignore
  const addr = CONFIG.tokens[symbol];
  if (!addr) throw new Error(`Missing token addr for ${symbol}`);
  return addr;
}

export async function quoteExactInputSingle(
  provider: ethers.JsonRpcProvider,
  pool: Pool,
  tokenInSymbol: string,
  amountIn: bigint
): Promise<bigint> {
  const quoter = new ethers.Contract(CONFIG.uni.quoter, QuoterV2, provider);
  const tokenIn = tokenAddress(tokenInSymbol);
  const tokenOut = tokenAddress(tokenInSymbol === pool.token0 ? pool.token1 : pool.token0);

  const params = { tokenIn, tokenOut, fee: pool.fee, amountIn, sqrtPriceLimitX96: 0 };
  const quoted = await quoter.quoteExactInputSingle.staticCall(params);
  return quoted.amountOut as bigint;
}

export function applySlippage(amount: bigint, bps: number, negative = true): bigint {
  const num = amount * BigInt(10000 + (negative ? -bps : bps));
  return num / BigInt(10000);
}
