import { ethers } from "ethers";
import { CONFIG } from "./config";

export async function sendWithTimeboostStub(provider: ethers.JsonRpcProvider, signedTx: string, bidWei: bigint) {
  console.log(`[Timeboost STUB] Intended bid (wei):`, bidWei.toString());
  const resp = await provider.send("eth_sendRawTransaction", [signedTx]);
  return resp;
}
