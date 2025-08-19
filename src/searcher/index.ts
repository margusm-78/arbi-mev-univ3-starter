import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

import { CONFIG, ROUTERS } from "./config";
import { buildTwoPoolLoop } from "./graph";
import { simulateTwoHop, evEstimateUSDC } from "./simulator";
import { makeProvider } from "./univ3";
import { sendWithTimeboostStub } from "./timeboost";
import { estimateGasUSDC } from "./gas";
import { recordMetric } from "./metrics";
import ArbiRouterAbi from "./abi/ArbiSearcherRouter.json";
import SwapRouter02Abi from "./abi/SwapRouter02.json";

async function main() {
  const provider = makeProvider();
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  if (!CONFIG.router) throw new Error("Set ROUTER_ADDRESS in .env");

  const router = new ethers.Contract(CONFIG.router, ArbiRouterAbi, wallet);
  const [p0, p1] = CONFIG.uni.pools;
  const swapRouter02 = new ethers.Contract(ROUTERS.swapRouter02, SwapRouter02Abi, wallet);

  provider.on("block", async (bn) => {
    try {
      const notionalUSDC = 5_000n * 10n ** 6n;
      const sim = await simulateTwoHop([p0, p1], notionalUSDC);

      // Build a candidate tx to estimate gas→USDC
      const deadline = Math.floor(Date.now()/1000) + 30;
      const dummySteps = [
        { target: swapRouter02.target as string, data: "0x", value: 0n },
        { target: swapRouter02.target as string, data: "0x", value: 0n }
      ];
      const dummyData = router.interface.encodeFunctionData("exec", [CONFIG.tokens.USDC, 0, dummySteps]);
      const gasEst = await estimateGasUSDC(provider, { to: CONFIG.router, data: dummyData });
      const gasUSDC = gasEst.usdcCost;

      const evUSDC = evEstimateUSDC(sim.grossUSDC, notionalUSDC, gasUSDC, 0n);

      console.log(`[${bn}] Gross ${Number(sim.grossUSDC)/1e6} USDC | Gas ${Number(gasUSDC)/1e6} | EV ${Number(evUSDC)/1e6} USDC`);
      recordMetric({ ts: Date.now(), block: bn, route: `${p0.name}->${p1.name}`, notionalUSDC: Number(notionalUSDC), grossUSDC: Number(sim.grossUSDC), evUSDC: Number(evUSDC), gasUSDC: Number(gasUSDC), executed: false });

      if (evUSDC > BigInt(CONFIG.uni.minProfitUSDC)) {
        if (CONFIG.dryRun) { console.log("DRY_RUN: would trade"); return; }

        const step1 = swapRouter02.interface.encodeFunctionData("exactInputSingle", [{
          tokenIn: CONFIG.tokens.USDC,
          tokenOut: CONFIG.tokens.WETH,
          fee: p0.fee,
          recipient: CONFIG.router,
          deadline,
          amountIn: notionalUSDC,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0
        }]);

        const step2 = swapRouter02.interface.encodeFunctionData("exactInputSingle", [{
          tokenIn: CONFIG.tokens.WETH,
          tokenOut: CONFIG.tokens.USDC,
          fee: p1.fee,
          recipient: CONFIG.router,
          deadline,
          amountIn: sim.hop1OutWETH,
          amountOutMinimum: sim.minOutUSDC,
          sqrtPriceLimitX96: 0
        }]);

        const steps = [
          { target: swapRouter02.target as string, data: step1, value: 0n },
          { target: swapRouter02.target as string, data: step2, value: 0n }
        ];

        const txData = router.interface.encodeFunctionData("exec", [CONFIG.tokens.USDC, evUSDC, steps]);
        const tx = await wallet.populateTransaction({ to: CONFIG.router, data: txData, value: 0 });
        const signed = await wallet.signTransaction(tx);
        const res = await sendWithTimeboostStub(provider, signed, CONFIG.timeboost.defaultBidWei);
        console.log("Sent:", res);
        recordMetric({ ts: Date.now(), block: bn, route: `${p0.name}->${p1.name}`, notionalUSDC: Number(notionalUSDC), grossUSDC: Number(sim.grossUSDC), evUSDC: Number(evUSDC), gasUSDC: Number(gasUSDC), executed: true, txHash: res, success: true });
      }
    } catch (e:any) { console.error("loop", e?.message || e); }
  });
}

main().catch(console.error);
