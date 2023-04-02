require('dotenv').config({path:__dirname+'/.env'});
require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-toolbox");
const { ALCHEMY_KEY, PRIVATE_KEY, ETHERSCAN_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      accounts: [PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: `${ETHERSCAN_KEY}`
  }
};
