// 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

const hre = require("hardhat");
const MarketNFTArtifact = require("../artifacts/contracts/MarketNFT.sol/MarketNFT.json")
const { utils } = require("ethers")

async function main() {
    const [signer] = await hre.ethers.getSigners()

    // const Erc20Addr = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    const MarketNFTAddr = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

    const MarketNFTContract = new hre.ethers.Contract(
        MarketNFTAddr,
        MarketNFTArtifact.abi,
        signer
    )
    
    const result = await MarketNFTContract.connect(signer).balance()
    console.log(result);

    const URI = 'https://gateway.pinata.cloud/ipfs/QmWxi3XogEUeFmHVjVhjJfQAKgX1oLPADTuMBhDMqRC3aa?filename=1.json'
    const tokenPrice = 100
    const nativePrice = utils.parseEther("1.0")
    const creatorFEE = 1000
    const FEE = utils.parseUnits("25.0", 15)

    const mint = await MarketNFTContract.connect(signer).createNFT(URI, tokenPrice, nativePrice, creatorFEE, {value: FEE})
    console.log(mint);
    await mint.wait()
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
