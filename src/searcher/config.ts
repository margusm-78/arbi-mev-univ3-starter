import * as dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  rpcUrl: process.env.ARB_RPC_URL!,
  dryRun: (process.env.DRY_RUN || "true").toLowerCase() === "true",
  router: process.env.ROUTER_ADDRESS!,

  tokens: {
    USDC: process.env.PROFIT_TOKEN!,
    WETH: process.env.WETH!
  },

  uni: {
    quoter: process.env.UNIV3_QUOTER!,
    pools: [
      { name: "USDC/WETH 0.05%", address: "0xC31e54c7A869B9fCBeCc14363cF510D1c41FA443", token0: "USDC", token1: "WETH", fee: 500 },
      { name: "USDC/WETH 0.30%", address: "0xC473E2AeE3441bF9240BE85Eb122aBb059A3B57C", token0: "USDC", token1: "WETH", fee: 3000 }
    ],
    minProfitUSDC: 5_00,
    maxSlippageBps: 20
  },

  timeboost: { defaultBidWei: BigInt(process.env.TIMEBOOST_DEFAULT_BID || "0") }
};

export const ROUTERS = {
  swapRouter02: process.env.SWAP_ROUTER02!,
  universalRouter: process.env.UNIVERSAL_ROUTER || ""
};

export const LIQUIDATION = {
  aavePool: process.env.AAVE_V3_POOL || "",
  radiantPool: process.env.RADIANT_POOL || "",
  beneficiary: process.env.LIQUIDATION_BENEFICIARY || ""
};
