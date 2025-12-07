import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
//import { Contract } from "ethers";

/**
 * Deploys a contract named "BettingContract" using the deployer account.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployBettingContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("BettingContract", { // Kontrat Adı: BettingContract
    from: deployer,
    // Contract constructor arguments (Kurucu argümanı kaldırıldı, çünkü BettingContract argüman almıyor)
    // args: [deployer], // <-- Silindi veya yorum satırı yapıldı
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  // Bu kısım, dağıtım sonrası etkileşim (greeting metodu) artık BettingContract'ta olmadığı için temizlendi.
  // const bettingContract = await hre.ethers.getContract<Contract>("BettingContract", deployer);
  // console.log("👋 Betting Contract deployed.");
};

export default deployBettingContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags BettingContract
deployBettingContract.tags = ["BettingContract"]; // Tag adı değişti