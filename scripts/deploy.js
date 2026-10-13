const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const Upload = await hre.ethers.getContractFactory("Upload");
  const upload = await Upload.deploy();

  await upload.deployed();

  console.log("=================================================");
  console.log(`Upload contract deployed to: ${upload.address}`);
  console.log(`Network: ${hre.network.name}`);
  console.log("=================================================");

  // Save the deployed address for the frontend to consume automatically
  const contractsDir = path.join(__dirname, "..", "client", "src", "artifacts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  const addressData = {
    address: upload.address,
    network: hre.network.name,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify(addressData, null, 2)
  );

  console.log(`Contract address saved to: ${path.join(contractsDir, "contract-address.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

