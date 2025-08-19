import { ethers } from "ethers";
import { LIQUIDATION } from "./config";

const RADIANT_POOL_ABI = [{
  "inputs":[
    {"internalType":"address","name":"collateral","type":"address"},
    {"internalType":"address","name":"debtAsset","type":"address"},
    {"internalType":"address","name":"user","type":"address"},
    {"internalType":"uint256","name":"debtToCover","type":"uint256"},
    {"internalType":"bool","name":"receiveAToken","type":"bool"}
  ],
  "name":"liquidationCall",
  "outputs":[],
  "stateMutability":"nonpayable",
  "type":"function"
}];

export function getRadiantPool(signer: ethers.Signer) {
  if (!LIQUIDATION.radiantPool) throw new Error("RADIANT_POOL not set");
  return new ethers.Contract(LIQUIDATION.radiantPool, RADIANT_POOL_ABI, signer);
}
