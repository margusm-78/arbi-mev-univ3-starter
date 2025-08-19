import { ethers } from "ethers";
import { CONFIG } from "./config";
import { getAavePool } from "./aave";
import { getRadiantPool } from "./radiant";
import { getUniversalRouter, encodeV3ExactIn, bytesConcat, Commands, encodeV3Path } from "./universalRouter";
import ArbiRouterAbi from "./abi/ArbiSearcherRouter.json";

export async function execLiquidation({
  signer,
  protocol,
  collateral,
  debtAsset,
  user,
  debtToCover,
  v3PathTokens,
  v3PathFees,
  minOutUSDC,
}: {
  signer: ethers.Wallet,
  protocol: "aave" | "radiant",
  collateral: string,
  debtAsset: string,
  user: string,
  debtToCover: bigint,
  v3PathTokens: string[],
  v3PathFees: number[],
  minOutUSDC: bigint
}) {
  const pool = protocol === "aave" ? getAavePool(signer) : getRadiantPool(signer);
  const ur = getUniversalRouter(signer);
  const router = new ethers.Contract(process.env.ROUTER_ADDRESS!, ArbiRouterAbi, signer);

  const liqData = pool.interface.encodeFunctionData("liquidationCall", [collateral, debtAsset, user, debtToCover, false]);

  const path = encodeV3Path(v3PathTokens, v3PathFees);
  const deadline = Math.floor(Date.now()/1000) + 60;
  const cmd = bytesConcat([Commands.V3_SWAP_EXACT_IN]);
  const input = encodeV3ExactIn(path, process.env.ROUTER_ADDRESS!, 0n, minOutUSDC);
  const urData = ur.interface.encodeFunctionData("execute", [cmd, [input], deadline]);

  const steps = [
    { target: pool.target as string, data: liqData, value: 0n },
    { target: ur.target as string, data: urData, value: 0n }
  ];

  const data = router.interface.encodeFunctionData("exec", [CONFIG.tokens.USDC, minOutUSDC, steps]);
  const tx = await signer.populateTransaction({ to: router.target as string, data });
  return tx;
}
