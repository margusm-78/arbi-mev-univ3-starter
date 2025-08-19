import { ethers } from "ethers";
import { CONFIG } from "./config";
import { tokenAddress } from "./univ3";
import QuoterV2 from "./abi/QuoterV2.json";

export async function estimateGasUSDC(
  provider: ethers.JsonRpcProvider,
  tx: ethers.TransactionRequest,
  bufferBps = 200
) {
  const [gasLimit, feeData] = await Promise.all([
    provider.estimateGas(tx),
    provider.getFeeData()
  ]);

  const gasPrice = (feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n);
  let ethCost = gasLimit * gasPrice;
  ethCost = (ethCost * (10000n + BigInt(bufferBps))) / 10000n;

  const weth = tokenAddress("WETH");
  const usdc = tokenAddress("USDC");
  const quoter = new ethers.Contract(CONFIG.uni.quoter, QuoterV2, provider);

  const oneEth = 10n ** 18n;
  const q = await quoter.quoteExactInputSingle.staticCall({ tokenIn: weth, tokenOut: usdc, fee: 500, amountIn: oneEth, sqrtPriceLimitX96: 0 });
  const usdcPerEth = q.amountOut as bigint;
  const usdcCost = (ethCost * usdcPerEth) / oneEth;
  return { gasLimit, gasPrice, ethCost, usdcCost };
}
