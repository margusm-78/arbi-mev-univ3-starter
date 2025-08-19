import { ethers } from "ethers";
import UniversalRouterAbi from "./abi/UniversalRouter.json";
import { ROUTERS } from "./config";

export const Commands = { V3_SWAP_EXACT_IN: 0x00 };

export function getUniversalRouter(providerOrSigner: ethers.Provider | ethers.Signer) {
  if (!ROUTERS.universalRouter) throw new Error("UNIVERSAL_ROUTER not set");
  return new ethers.Contract(ROUTERS.universalRouter, UniversalRouterAbi, providerOrSigner);
}

export function encodeV3Path(tokens: string[], fees: number[]) {
  if (tokens.length !== fees.length + 1) throw new Error("Invalid path");
  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    path += tokens[i].slice(2);
    path += fees[i].toString(16).padStart(6, "0");
  }
  path += tokens[tokens.length - 1].slice(2);
  return "0x" + path.slice(2);
}

export function encodeV3ExactIn(path: string, recipient: string, amountIn: bigint, amountOutMinimum: bigint) {
  const types = ["bytes", "address", "uint256", "uint256"];
  const values = [path, recipient, amountIn, amountOutMinimum];
  return ethers.AbiCoder.defaultAbiCoder().encode(types, values);
}

export function bytesConcat(arr: number[]) {
  return "0x" + Buffer.from(arr).toString("hex");
}
