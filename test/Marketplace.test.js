const { expect } = require("chai")
const { ethers } = require("hardhat")
const { utils } = require("ethers")

describe("MarketNFT", function() {
    let owner, seller, buyer, buyer2
    let market, erc20

    before(async function() {
        const signers = await ethers.getSigners();
        owner = signers[0];
        seller = signers[1];
        buyer = signers[2];
        buyer2 = signers[3]; 

        const ERC20Market = await ethers.getContractFactory("MyToken", owner)
        erc20 = await ERC20Market.deploy()
        await erc20.deployed()

        const NFTMarket = await ethers.getContractFactory("MarketNFT", owner)
        market = await NFTMarket.deploy(erc20.address)
        await market.deployed()
    })
    // beforeEach(async function() {})

    it("should be deployed!", async function() {
        expect(market.address).to.be.properAddress;
        expect(erc20.address).to.be.properAddress;
    })

    it("mint token ERC20", async function() {
        const valueOfToken = 1000;
        const mint = await erc20.connect(owner).mint(buyer2.address, valueOfToken)
        const balanceOfAcc2 = await erc20.connect(buyer2).balanceOf(buyer2.address)
        expect(balanceOfAcc2).to.eq(valueOfToken)
    })

    it("mint NFT", async function() {
        const URI = 'https://gateway.pinata.cloud/ipfs/QmWxi3XogEUeFmHVjVhjJfQAKgX1oLPADTuMBhDMqRC3aa?filename=1.json';
        const tokenPrice = 100;
        const nativePrice = utils.parseEther("1.0");
        const creatorFEES = 10;
        
        // const FEE = utils.parseUnits("25.0", 15)
        const FEE = 25000000000000000n

        const mint = await market.connect(seller).createToken(URI, tokenPrice, nativePrice, creatorFEES, {value: FEE})
        await expect(mint).to.emit(market, "Created").withArgs(1, seller.address, market.address, tokenPrice, nativePrice, false)
        const mint2 = await market.connect(seller).createToken(URI, tokenPrice, nativePrice, creatorFEES, {value: FEE})
        await expect(mint2).to.emit(market, "Created").withArgs(2, seller.address, market.address, tokenPrice, nativePrice, false)
        const mint3 = await market.connect(seller).createToken(URI, tokenPrice, nativePrice, creatorFEES, {value: FEE})
        await expect(mint3).to.emit(market, "Created").withArgs(3, seller.address, market.address, tokenPrice, nativePrice, false)

        const balanceNFT = await market.balanceOf(market.address);

        expect(balanceNFT).to.eq(3)

        await expect(() => mint).to.changeEtherBalances([seller, market], [-FEE, FEE]);
    })

    it("mint without necessary ether", async function() {
        const URI = 'https://gateway.pinata.cloud/ipfs/QmWxi3XogEUeFmHVjVhjJfQAKgX1oLPADTuMBhDMqRC3aa?filename=1.json';
        const tokenPrice = 100;
        const nativePrice = utils.parseEther("1.0");
        const creatorFEES = 10;
        
        // const FEE = utils.parseUnits("25.0", 15)
        const FEE = 1000000000000000n;

        await expect(
            market.connect(seller).createToken(URI, tokenPrice, nativePrice, creatorFEES, {value: FEE})
        ).to.be.revertedWith("You must pay marketplace fees")
    })

    it("verification of NFT data after minting", async function() {
        const data = await market.infoAboutNFT(1);

        expect(data.seller).to.eq(seller.address)
        expect(data.owner).to.eq(market.address)
        expect(data.creator).to.eq(seller.address)
        expect(data.sold).to.eq(false)
    })

    it("buy NFT with Ether", async function() {
        const money = 1000000000000000000n;
        const money2 = 950000000000000000n;

        const buy = await market.connect(buyer).buyWithEther(1, {value: money})
        await expect(buy).to.emit(market, "SentNFT").withArgs(seller.address, buyer.address, 0, money, 1)
        await expect(() => buy).to.changeEtherBalances([buyer, seller], [-money, money2]);  
    })

    it("buy without necessary ether", async function() {
        const money = 100000000000000000n;

        await expect(
            market.connect(buyer).buyWithEther(2, {value: money})
        ).to.be.revertedWith("Please submit the asking price in order to complete the purchase")
    })

    it("verification of NFT data after buying", async function() {
        const data = await market.infoAboutNFT(1);

        expect(data.seller).to.eq("0x0000000000000000000000000000000000000000")
        expect(data.owner).to.eq(buyer.address)
        expect(data.creator).to.eq(seller.address)
        expect(data.sold).to.eq(true)
    })

    it("buy NFT with token", async function() {
        const amount = 100;
        const balance = 95;
        const marketFEES = 5;
        const approve = await erc20.connect(buyer2).approve(market.address, amount)
        const buy = await market.connect(buyer2).buyWithToken(2, amount)

        await expect(buy).to.emit(market, "SentNFT").withArgs(seller.address, buyer2.address, amount, 0, 2)
        await expect(() => buy).to.changeTokenBalances(erc20, [buyer2, market.address, seller], [-amount, marketFEES, balance]);
    })

    it("buy without necessary token", async function() {
        const amount = 100;
        const amount2 = 10;
        const approve = await erc20.connect(buyer2).approve(market.address, amount)

        await expect(
            market.connect(buyer2).buyWithToken(2, amount2)
        ).to.be.revertedWith("Please submit the asking price in order to complete the purchase")
    })

    it("verification of NFT data after buying with token", async function() {
        const data = await market.infoAboutNFT(2);

        expect(data.seller).to.eq("0x0000000000000000000000000000000000000000")
        expect(data.owner).to.eq(buyer2.address)
        expect(data.creator).to.eq(seller.address)
        expect(data.sold).to.eq(true)
    })

    it("resell NFT", async function() {
        const tokenID = 1;
        const tokenPrice = 200;
        const nativePrice = utils.parseEther("2.0");
        const marketFEES = 25000000000000000n;

        const resell = await market.connect(buyer).resellNFT(tokenID, tokenPrice, nativePrice, {value: marketFEES});

        await expect(() => resell).to.changeEtherBalances([buyer, market], [-marketFEES, marketFEES]);
    })

    it("resell NFT with invalid data", async function() {
        const tokenID = 2;
        const tokenPrice = 200;
        const nativePrice = utils.parseEther("2.0");
        const marketFEES = 250000000000000n;
        const data = await market.infoAboutNFT(2);


        await expect(market.connect(buyer2).resellNFT(tokenID, tokenPrice, nativePrice, {value: marketFEES}))
        .to.be.revertedWith("You must pay marketplace fees")
    })

    it("verification of NFT data after resell", async function() {
        const data = await market.infoAboutNFT(1);

        expect(data.seller).to.eq(buyer.address)
        expect(data.owner).to.eq(market.address)
        expect(data.sold).to.eq(false)
    })

    it("cancellation of sale", async function() {
        const cancell = await market.connect(buyer).cancellationOfSale(1)
        const data = await market.infoAboutNFT(1);

        expect(data.owner).to.eq(buyer.address)
        expect(data.sold).to.eq(true)
    })

    it("withdraw by not an owner", async function() {

        
        await expect(market.connect(buyer).withdraw())
        .to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("withdraw", async function() {
        const withdraw = await market.connect(owner).withdraw()
        
        const currentEther = 150000000000000000n
        await expect(() => withdraw).to.changeEtherBalances([market.address, owner], [-currentEther, currentEther]);
    })

    it("withdraw without ethers", async function() {
        await expect(market.connect(owner).withdraw())
        .to.be.revertedWith("Balance is zero")
    })
})