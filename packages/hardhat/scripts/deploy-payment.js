const hre = require("hardhat");

async function main() {
  console.log("Развертывание PaymentContract...");

  const PaymentContract = await hre.ethers.getContractFactory("PaymentContract");
  const paymentContract = await PaymentContract.deploy();

  await paymentContract.waitForDeployment();
  const address = await paymentContract.getAddress();

  console.log("✅ PaymentContract развернут по адресу:", address);
  console.log("\nСкопируйте этот адрес в:");
  console.log("  - backend/.env (CONTRACT_ADDRESS)");
  console.log("  - frontend/.env (VITE_CONTRACT_ADDRESS)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

