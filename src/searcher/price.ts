import { ethers } from "ethers";
import { CONFIG } from "./config";
import { tokenAddress } from "./univ3";
import QuoterV2 from "./abi/QuoterV2.json";

export async function quoteEthToUsdc(provider: ethers.JsonRpcProvider, amountWei: bigint) {
  const weth = tokenAddress("WETH");
  const usdc = tokenAddress("USDC");
  const quoter = new ethers.Contract(CONFIG.uni.quoter, QuoterV2, provider);
  const q = await quoter.quoteExactInputSingle.staticCall({ tokenIn: weth, tokenOut: usdc, fee: 500, amountIn: amountWei, sqrtPriceLimitX96: 0 });
  return q.amountOut as bigint;
}
