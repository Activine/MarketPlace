// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract MarketNFT is ERC721, ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private tokenId;

    IERC20 public tokenAddress;
    // string memory baseURI = "https://ipfs.filebase.io/ipfs/"

    uint256 marketFEE = 0.025 ether;
    uint256 marketSellFEE = 500;

    mapping(uint256 => NFTItem) private idToMarketItem;
    mapping(uint256 => string) private _tokenURIs;

    event SentNFT(
        address from,
        address to,
        uint256 tokenPrice,
        uint256 nativePrice,
        uint tokenId
    );

    event Created(
        uint256 tokenId,
        address seller,
        address owner,
        uint256 tokenPrice,
        uint256 nativePrice,
        bool sold
    );

    event Resell(
        uint256 tokenId,
        address seller,
        uint256 tokenPrice,
        uint256 nativePrice
    );

    struct NFTItem {
        uint256 tokenId;
        string tokenURI;
        address payable creator;
        address payable seller;
        address payable owner;
        uint256 creatorFEE;
        uint256 tokenPrice;
        uint256 nativePrice;
        bool sold;
    }

    /**
     * @notice Constructor
     * @param _tokenAddress - deployed address of Erc20.sol
     */
    constructor(address _tokenAddress) ERC721("Activin Tokens", "ACT") {
        tokenAddress = IERC20(_tokenAddress);
    }

    function createNFT(
        string memory tokenURI,
        uint256 _tokenPrice,
        uint256 _nativePrice,
        uint256 _creatorFEE
    ) external payable nonReentrant returns (uint) {
        require(msg.sender != address(0), "Zero address");
        require(msg.value == marketFEE, "You must pay marketplace fee");
        require(_tokenPrice > 0 && _nativePrice > 0, "Price can't be zero");
        require(_creatorFEE <= 20000, "Should be less or equal than 20%");

        tokenId.increment();
        uint256 newTokenId = tokenId.current();

        _mint(msg.sender, newTokenId);
        _createMarketItem(
            newTokenId,
            _creatorFEE,
            _tokenPrice,
            _nativePrice,
            tokenURI
        );

        _tokenURIs[newTokenId] = tokenURI;

        _transfer(msg.sender, address(this), newTokenId);

        emit Created(
            newTokenId,
            msg.sender,
            address(this),
            _tokenPrice,
            _nativePrice,
            false
        );
        return newTokenId;
    }

    function buyWithToken(
        uint256 _tokenId,
        uint amount
    ) external payable nonReentrant {
        NFTItem storage item = idToMarketItem[_tokenId];

        uint256 feeAmount = (item.tokenPrice * marketSellFEE) / 10000;
        uint256 royaltyAmount = (item.tokenPrice * item.creatorFEE) / 10000;
        uint256 total = feeAmount + royaltyAmount + item.tokenPrice;
        address currentSeller = item.seller;

        require(amount == total, "Price differs from the cost");

        _transfer(address(this), msg.sender, _tokenId);

        // transfer fee amount
        tokenAddress.transferFrom(msg.sender, address(this), feeAmount);
        // transfer royalties
        tokenAddress.transferFrom(msg.sender, item.creator, royaltyAmount);
        // transfer to seller
        tokenAddress.transferFrom(msg.sender, item.seller, item.tokenPrice);

        item.owner = payable(msg.sender);
        item.sold = true;
        item.seller = payable(address(0));

        emit SentNFT(currentSeller, msg.sender, amount, msg.value, _tokenId);
    }

    function buyWithEther(uint256 _tokenId) external payable nonReentrant {
        NFTItem storage item = idToMarketItem[_tokenId];

        uint256 feeAmount = (item.nativePrice * marketSellFEE) / 10000;
        uint256 royaltyAmount = (item.nativePrice * item.creatorFEE) / 10000;
        uint256 total = feeAmount + royaltyAmount + item.nativePrice;
        address currentSeller = item.seller;

        require(msg.value == total, "Price differs from the cost");

        payable(item.seller).transfer(item.nativePrice);

        payable(item.creator).transfer(royaltyAmount);

        item.owner = payable(msg.sender);
        item.sold = true;
        item.seller = payable(address(0));

        _transfer(address(this), msg.sender, _tokenId);

        emit SentNFT(currentSeller, msg.sender, 0, msg.value, _tokenId);
    }

    function withdraw() external onlyOwner returns (bool) {
        require(address(this).balance > 0, "Balance is zero");
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Transfer failed");
        return true;
    }

    function resellNFT(
        uint256 _tokenId,
        uint256 _tokenPrice,
        uint256 _nativePrice
    ) external payable nonReentrant {
        require(
            idToMarketItem[_tokenId].owner == msg.sender,
            "Only item owner can perform this operation"
        );
        require(_tokenPrice > 0 && _nativePrice > 0, "Price can't be zero");
        require(msg.value == marketFEE, "You must pay marketplace fee");
        idToMarketItem[_tokenId].sold = false;
        idToMarketItem[_tokenId].tokenPrice = _tokenPrice;
        idToMarketItem[_tokenId].nativePrice = _nativePrice;
        idToMarketItem[_tokenId].seller = payable(msg.sender);
        idToMarketItem[_tokenId].owner = payable(address(this));

        _transfer(msg.sender, address(this), _tokenId);
        emit Resell(_tokenId, msg.sender, _tokenPrice, _nativePrice);
    }

    function cancellationOfSale(uint _tokenId) external {
        require(
            msg.sender == idToMarketItem[_tokenId].seller,
            "Only item seller can perform this operation"
        );
        idToMarketItem[_tokenId].sold = true;
        idToMarketItem[_tokenId].owner = payable(msg.sender);

        _transfer(address(this), msg.sender, _tokenId);
    }

    function infoAboutNFT(
        uint _tokenId
    ) external view returns (NFTItem memory) {
        return idToMarketItem[_tokenId];
    }

    function balance() external view onlyOwner returns (uint) {
        return address(this).balance;
    }
    
    function _createMarketItem(
        uint256 _tokenId,
        uint256 _creatorFEE,
        uint256 _tokenPrice,
        uint256 _nativePrice,
        string memory _tokenURI
    ) private {
        idToMarketItem[_tokenId] = NFTItem(
            _tokenId,
            _tokenURI,
            payable(msg.sender),
            payable(msg.sender),
            payable(address(this)),
            _creatorFEE,
            _tokenPrice,
            _nativePrice,
            false
        );
    }
}
