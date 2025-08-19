import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Deployer:", signer.address);

  const R = await ethers.getContractFactory("ArbiSearcherRouter");
  const r = await R.deploy(signer.address);
  await r.waitForDeployment();
  console.log("ArbiSearcherRouter:", await r.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
