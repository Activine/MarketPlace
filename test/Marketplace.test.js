const { expect } = require("chai")
const { ethers } = require("hardhat")
const { utils } = require("ethers")

describe("MarketNFT", function() {
    let owner, seller, buyer, buyer2
    let market, erc20

    before(async function() {
        const signers = await ethers.getSigners();
        owner = signers[0]
        seller = signers[1]
        buyer = signers[2]
        buyer2 = signers[3]

        const ERC20Market = await ethers.getContractFactory("MyToken", owner)
        erc20 = await ERC20Market.deploy()
        await erc20.deployed()

        const NFTMarket = await ethers.getContractFactory("MarketNFT", owner)
        market = await NFTMarket.deploy(erc20.address)
        await market.deployed()
    })

    it("should be deployed!", async function() {
        expect(market.address).to.be.properAddress
        expect(erc20.address).to.be.properAddress
    })

    it("mint token ERC20", async function() {
        const valueOfToken = 1000
        const mint = await erc20.connect(owner).mint(buyer2.address, valueOfToken)
        const balanceOfAcc2 = await erc20.connect(buyer2).balanceOf(buyer2.address)
        expect(balanceOfAcc2).to.eq(valueOfToken)
    })

    it("mint NFT", async function() {
        const URI = 'https://gateway.pinata.cloud/ipfs/QmWxi3XogEUeFmHVjVhjJfQAKgX1oLPADTuMBhDMqRC3aa?filename=1.json'
        const tokenPrice = 100
        const nativePrice = utils.parseEther("1.0")
        const creatorFEE = 1000
        const FEE = utils.parseUnits("25.0", 15)

        const mint = await market.connect(seller).createNFT(URI, tokenPrice, nativePrice, creatorFEE, {value: FEE})
        await expect(mint).to.emit(market, "Created").withArgs(1, seller.address, market.address, tokenPrice, nativePrice, false)
        const mint2 = await market.connect(seller).createNFT(URI, tokenPrice, nativePrice, creatorFEE, {value: FEE})
        await expect(mint2).to.emit(market, "Created").withArgs(2, seller.address, market.address, tokenPrice, nativePrice, false)
        const mint3 = await market.connect(seller).createNFT(URI, tokenPrice, nativePrice, creatorFEE, {value: FEE})
        await expect(mint3).to.emit(market, "Created").withArgs(3, seller.address, market.address, tokenPrice, nativePrice, false)

        const balanceNFT = await market.balanceOf(market.address)
        expect(balanceNFT).to.eq(3)

        await expect(() => mint).to.changeEtherBalances([seller, market], [-BigInt(FEE), BigInt(FEE)])
    })

    it("mint without necessary ether", async function() {
        const URI = 'https://gateway.pinata.cloud/ipfs/QmWxi3XogEUeFmHVjVhjJfQAKgX1oLPADTuMBhDMqRC3aa?filename=1.json'
        const tokenPrice = 100
        const nativePrice = utils.parseEther("1.0")
        const creatorFEE = 10
        const FEE = utils.parseUnits("2.0", 15)

        await expect(
            market.connect(seller).createNFT(URI, tokenPrice, nativePrice, creatorFEE, {value: FEE})
        ).to.be.revertedWith("You must pay marketplace fee")
    })

    it("verification of NFT data after minting", async function() {
        const data = await market.infoAboutNFT(1)

        expect(data.seller).to.eq(seller.address)
        expect(data.owner).to.eq(market.address)
        expect(data.creator).to.eq(seller.address)
        expect(data.sold).to.eq(false)
    })

    it("buy NFT with Ether", async function() {
        const currentNFT = await market.infoAboutNFT(1)

        const money = utils.parseUnits("1.0", 18)
        const creatorFEE = money * 1000 / 10000
        const marketFEE = money * 500 / 10000
        const totalAmountNFT = Number(money) + Number(creatorFEE) + Number(marketFEE)
        const totalAmountSeller = Number(currentNFT.nativePrice) + Number(creatorFEE)

        const buy = await market.connect(buyer).buyWithEther(1, {value: BigInt(totalAmountNFT)})
        await expect(buy).to.emit(market, "SentNFT").withArgs(seller.address, buyer.address, 0, BigInt(totalAmountNFT), 1)
        await expect(() => buy).to.changeEtherBalances([buyer, seller, market.address], [-BigInt(totalAmountNFT), BigInt(totalAmountSeller), BigInt(marketFEE)])
    })

    it("buy without necessary ether", async function() {
        const money = utils.parseUnits("1.0", 18)

        await expect(
            market.connect(buyer).buyWithEther(2, {value: money})
        ).to.be.revertedWith("Price differs from the cost")
    })

    it("verification of NFT data after buying", async function() {
        const data = await market.infoAboutNFT(1)

        expect(data.seller).to.eq(ethers.constants.AddressZero)
        expect(data.owner).to.eq(buyer.address)
        expect(data.creator).to.eq(seller.address)
        expect(data.sold).to.eq(true)
    })

    it("buy NFT with token", async function() {
        const currentNFT = await market.infoAboutNFT(2)

        const marketFEE = Number(currentNFT.tokenPrice) * 500 / 10000
        const creatorFEE = Number(currentNFT.tokenPrice) * 1000 / 10000
        const totalAmountNFT = Number(currentNFT.tokenPrice) + Number(creatorFEE) + Number(marketFEE)
        const totalAmountSeller = Number(currentNFT.tokenPrice) + Number(creatorFEE)

        const approve = await erc20.connect(buyer2).approve(market.address, totalAmountNFT)
        const buy = await market.connect(buyer2).buyWithToken(2, totalAmountNFT)
        await expect(buy).to.emit(market, "SentNFT").withArgs(seller.address, buyer2.address, totalAmountNFT, 0, 2)
        await expect(() => buy).to.changeTokenBalances(erc20, [buyer2, market.address, seller], [-totalAmountNFT, marketFEE, totalAmountSeller])
    })

    it("buy without necessary token", async function() {
        const currentNFT = await market.infoAboutNFT(3)
        
        const incorrectPrice = 100
        const marketFEE = Number(currentNFT.tokenPrice) * 500 / 10000
        const creatorFEE = Number(currentNFT.tokenPrice) * 1000 / 10000
        const totalAmountNFT = Number(currentNFT.tokenPrice) + Number(creatorFEE) + Number(marketFEE)

        const approve = await erc20.connect(buyer2).approve(market.address, totalAmountNFT)
        await expect(
            market.connect(buyer2).buyWithToken(3, incorrectPrice)
        ).to.be.revertedWith("Price differs from the cost")
    })

    it("verification of NFT data after buying with token", async function() {
        const data = await market.infoAboutNFT(2)

        expect(data.seller).to.eq(ethers.constants.AddressZero)
        expect(data.owner).to.eq(buyer2.address)
        expect(data.creator).to.eq(seller.address)
        expect(data.sold).to.eq(true)
    })

    it("resell NFT", async function() {
        const tokenID = 1
        const tokenPrice = 200
        const nativePrice = utils.parseUnits("2.0", 18)
        const marketFEE = utils.parseUnits("25.0", 15)

        const resell = await market.connect(buyer).resellNFT(tokenID, tokenPrice, nativePrice, {value: marketFEE})
        await expect(() => resell).to.changeEtherBalances([buyer, market], [-BigInt(marketFEE), BigInt(marketFEE)])
        await expect(resell).to.emit(market, "Resell").withArgs(tokenID, buyer.address, tokenPrice, nativePrice)
    })

    it("resell NFT with invalid data", async function() {
        const tokenID = 2
        const tokenPrice = 200
        const nativePrice = utils.parseUnits("2.0", 18)
        const marketFEE = utils.parseUnits("25.0", 10)
        const zeroPrice = 0

        await expect(market.connect(buyer2).resellNFT(tokenID, tokenPrice, nativePrice, {value: marketFEE}))
        .to.be.revertedWith("You must pay marketplace fee")
        
        await expect(market.connect(buyer).resellNFT(tokenID, tokenPrice, nativePrice, {value: marketFEE}))
        .to.be.revertedWith("Only item owner can perform this operation")

        await expect(market.connect(buyer2).resellNFT(tokenID, zeroPrice, zeroPrice, {value: marketFEE}))
        .to.be.revertedWith("Price can't be zero")
    })

    it("verification of NFT data after resell", async function() {
        const data = await market.infoAboutNFT(1)

        expect(data.seller).to.eq(buyer.address)
        expect(data.owner).to.eq(market.address)
        expect(data.sold).to.eq(false)
    })

    it("cancellation of sale", async function() {
        const cancell = await market.connect(buyer).cancellationOfSale(1)
        const data = await market.infoAboutNFT(1)

        expect(data.owner).to.eq(buyer.address)
        expect(data.sold).to.eq(true)
    })

    it("withdraw by not an owner", async function() {
        await expect(market.connect(buyer).withdraw())
        .to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("withdraw", async function() {
        const balance = await market.connect(owner).balance()
        const withdraw = await market.connect(owner).withdraw()

        await expect(() => withdraw).to.changeEtherBalances([market.address, owner], [-BigInt(balance), BigInt(balance)])
    })

    it("withdraw without ethers", async function() {
        await expect(market.connect(owner).withdraw())
        .to.be.revertedWith("Balance is zero")
    })
})