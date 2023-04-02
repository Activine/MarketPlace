// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {

  const [signer] = await hre.ethers.getSigners()
  
  const ERC20 = await ethers.getContractFactory("MyToken", signer)
  erc20 = await ERC20.deploy()
  await erc20.deployed()

  const NFTMarket = await ethers.getContractFactory("MarketNFT", signer)
  market = await NFTMarket.deploy(erc20.address)
  await market.deployed()

  console.log(erc20.address);
  console.log(market.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// 0xf95ff20C4A0821B1B9303c187fF1ce512392625F
// 0xB5a1A8A378Aed3F8edA6E97d96100d54b00d7fB0

// Successfully verified contract MyToken on Etherscan.
// https://sepolia.etherscan.io/address/0xf95ff20C4A0821B1B9303c187fF1ce512392625F#code

// Successfully verified contract MarketNFT on Etherscan.
// https://sepolia.etherscan.io/address/0xB5a1A8A378Aed3F8edA6E97d96100d54b00d7fB0#code