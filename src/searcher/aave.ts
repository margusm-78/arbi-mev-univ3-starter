import { ethers } from "ethers";
import { LIQUIDATION } from "./config";

const AAVE_POOL_ABI = [{
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

export function getAavePool(signer: ethers.Signer) {
  if (!LIQUIDATION.aavePool) throw new Error("AAVE_V3_POOL not set");
  return new ethers.Contract(LIQUIDATION.aavePool, AAVE_POOL_ABI, signer);
}
