import { ethers } from "ethers";
import { CONFIG } from "./config";
import { Pool, quoteExactInputSingle, applySlippage, makeProvider } from "./univ3";

export async function simulateTwoHop(pools: [Pool, Pool], amountInUSDC: bigint) {
  const provider = makeProvider();
  const hop1Out = await quoteExactInputSingle(provider, pools[0], "USDC", amountInUSDC);
  const hop2Out = await quoteExactInputSingle(provider, pools[1], "WETH", hop1Out);
  const minOut = applySlippage(hop2Out, CONFIG.uni.maxSlippageBps, true);

  return { hop1OutWETH: hop1Out, grossUSDC: hop2Out, minOutUSDC: minOut };
}

export function evEstimateUSDC(gross: bigint, amountIn: bigint, gasUSDC: bigint, _bidWei: bigint): bigint {
  return gross - amountIn - gasUSDC;
}
