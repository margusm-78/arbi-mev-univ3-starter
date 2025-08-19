import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

import { Watcher } from "./watcher";
import { execLiquidation } from "./liquidation";
import { CONFIG } from "./config";
import { recordMetric } from "./metrics";

type WatcherConfig = {
  aaveData?: string;              // DataProvider address
  radiantData?: string;           // DataProvider address
  users: string[];                // addresses to check
  // default UR path to unwind collateral to USDC if not specified per-candidate
  defaultPath?: { tokens: string[]; fees: number[] };
  pollSeconds?: number;
};

function loadConfig(): WatcherConfig {
  const p = path.join(process.cwd(), "watcher.config.json");
  if (!fs.existsSync(p)) throw new Error("watcher.config.json not found");
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

async function main(){
  const cfg = loadConfig();
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const watcher = new Watcher(provider, {
    aaveData: cfg.aaveData,
    radiantData: cfg.radiantData,
    users: cfg.users
  });

  const poll = Math.max(5, cfg.pollSeconds || 15);
  console.log(`Watcher running. Poll=${poll}s | Users=${cfg.users.length}`);

  while (true) {
    try {
      const cands = await watcher.tick();
      if (cands.length) {
        console.log(`[candidates]`, cands.map(c => `${c.protocol}:${c.user} hf=${Number(c.healthFactorRay)/1e18}`));
      }

      for (const c of cands) {
        // NOTE: real bots derive debtAsset, collateral, and debtToCover from on-chain user reserve data.
        // Here we assume USDC debt and that seized collateral is the first hop in the path.
        const pathCfg = cfg.defaultPath;
        if (!pathCfg) { console.warn("No defaultPath provided; skip"); continue; }
        const collateral = pathCfg.tokens[0];
        const debtAsset = CONFIG.tokens.USDC;
        const debtToCover = 500n * 10n**6n; // example: repay 500 USDC

        // Pre-quoted minOutUSDC — in practice, compute amounts from reserve data & quotes.
        const minOutUSDC = 495n * 10n**6n; // ~1% slippage cushion

        if ((process.env.DRY_RUN || "true").toLowerCase() === "true") {
          console.log(`[DRY_RUN] Would liquidate ${c.user} on ${c.protocol} covering ${Number(debtToCover)/1e6} USDC`);
          recordMetric({ ts: Date.now(), block: 0, route: "LIQ", notionalUSDC: Number(debtToCover), grossUSDC: Number(minOutUSDC), evUSDC: Number(minOutUSDC - debtToCover), gasUSDC: 0, executed: false });
          continue;
        }

        const txReq = await execLiquidation({
          signer: wallet,
          protocol: c.protocol,
          collateral,
          debtAsset,
          user: c.user,
          debtToCover,
          v3PathTokens: pathCfg.tokens,
          v3PathFees: pathCfg.fees,
          minOutUSDC
        });

        const resp = await wallet.sendTransaction(txReq);
        console.log(`[liq] sent ${resp.hash}`);
        await resp.wait();
        recordMetric({ ts: Date.now(), block: 0, route: "LIQ", notionalUSDC: Number(debtToCover), grossUSDC: Number(minOutUSDC), evUSDC: Number(minOutUSDC - debtToCover), gasUSDC: 0, executed: true, txHash: resp.hash, success: true });
      }
    } catch (e:any) {
      console.error("watcher loop error:", e?.message || e);
    }
    await new Promise(r => setTimeout(r, poll*1000));
  }
}

main().catch(console.error);
