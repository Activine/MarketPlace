// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract MarketNFT is ERC721, ReentrancyGuard, Ownable{
    using Counters for Counters.Counter;
    Counters.Counter private tokenId;

    IERC20 public tokenAddress;
    // address payable owner;
    // string memory baseURI = "https://ipfs.filebase.io/ipfs/"

    uint256 marketFEES = 0.025 ether;
    uint256 marketSellFEES = 5;

    mapping(uint256 => NFTItem) private idToMarketItem;
    mapping(uint256 => string) private _tokenURIs;

    event SentNFT(
      address from, 
      address to, 
      uint256 tokenPrice,
      uint256 nativePrice,
      uint tokenId
    );
    
    event HI(
      string str
    );

    event Created(
      uint256 tokenId,
      address seller,
      address owner,
      uint256 tokenPrice,
      uint256 nativePrice,
      bool sold
    );

    struct NFTItem {
      uint256 tokenId;
      string tokenURI;
      address payable creator;
      address payable seller;
      address payable owner;
      uint256 creatorFEES;
      uint256 tokenPrice;
      uint256 nativePrice;
      bool sold;
    }

    constructor(address _tokenAddress) ERC721("Activin Tokens", "ACT") {
      tokenAddress = IERC20(_tokenAddress);
    }

    function createToken(
      string memory tokenURI, 
      uint256 _tokenPrice, 
      uint256 _nativePrice, 
      uint256 _creatorFEES
      ) public payable nonReentrant returns (uint) {
      tokenId.increment();
      uint256 newTokenId = tokenId.current();

      _mint(msg.sender, newTokenId);
      createMarketItem(newTokenId, _creatorFEES, _tokenPrice, _nativePrice, tokenURI);

      emit Created(newTokenId, msg.sender, address(this), _tokenPrice, _nativePrice, false);
      return newTokenId;
    }

    function createMarketItem(
      uint256 _tokenId, 
      uint256 _creatorFEES, 
      uint256 _tokenPrice, 
      uint256 _nativePrice, 
      string memory _tokenURI
      ) private {
      require(_tokenPrice > 0 && _nativePrice > 0, "Price can't be zero");
      require(_creatorFEES == 5 || _creatorFEES == 10 ||_creatorFEES == 15 || _creatorFEES == 20, "Incorrect value! Creators fees can be equal only 5, 10, 15 or 20%");
      require(msg.value == marketFEES, "You must pay marketplace fees");

      idToMarketItem[_tokenId] =  NFTItem(
        _tokenId,
        _tokenURI,
        payable(msg.sender),
        payable(msg.sender),
        payable(address(this)),
        _creatorFEES,
        _tokenPrice,
        _nativePrice,
        false
      );

      _tokenURIs[_tokenId] = _tokenURI;

      _transfer(msg.sender, address(this), _tokenId);
    }

    function buyWithToken(uint256 _tokenId, uint amount) public payable {

      NFTItem storage item = idToMarketItem[_tokenId];
      
      require(amount == item.tokenPrice, "Please submit the asking price in order to complete the purchase");

      _transfer(address(this), msg.sender, _tokenId);

      tokenAddress.transferFrom(msg.sender, address(this), amount * marketSellFEES / 100);
      tokenAddress.transferFrom(msg.sender, item.creator, amount * item.creatorFEES / 100);
      tokenAddress.transferFrom(msg.sender, item.seller, amount * (100 - item.creatorFEES - marketSellFEES) / 100);

      emit SentNFT(item.seller, msg.sender, amount, msg.value, _tokenId);
      _processOfBuying(_tokenId);

    }

    function buyWithEther (uint256 _tokenId) public payable{
      NFTItem storage item = idToMarketItem[_tokenId];

      require(msg.value == item.nativePrice, "Please submit the asking price in order to complete the purchase");
      require(msg.value == ((msg.value * (100 - item.creatorFEES - marketSellFEES) / 100) + (msg.value * item.creatorFEES / 100) + (msg.value * marketSellFEES / 100)),
       "calculation factor is incorrect");

      payable(item.seller).transfer(msg.value * (100 - item.creatorFEES - marketSellFEES) / 100);
      payable(item.creator).transfer(msg.value * item.creatorFEES / 100);
      
      emit SentNFT(idToMarketItem[_tokenId].seller, msg.sender, 0, msg.value, _tokenId);
      
      _processOfBuying(_tokenId);
      _transfer(address(this), msg.sender, _tokenId);

    }

    function withdraw() public onlyOwner() {
      require(address(this).balance > 0, "Balance is zero");
      payable(owner()).transfer(address(this).balance);
    }
    
    function resellNFT(uint256 _tokenId, uint256 _tokenPrice, uint256 _nativePrice) public payable {
      require(idToMarketItem[_tokenId].owner == msg.sender, "Only item owner can perform this operation");
      require(msg.value == marketFEES, "You must pay marketplace fees");
      idToMarketItem[_tokenId].sold = false;
      idToMarketItem[_tokenId].tokenPrice = _tokenPrice;
      idToMarketItem[_tokenId].nativePrice = _nativePrice;
      idToMarketItem[_tokenId].seller = payable(msg.sender);
      idToMarketItem[_tokenId].owner = payable(address(this));

      _transfer(msg.sender, address(this), _tokenId);
    }

    function cancellationOfSale(uint _tokenId) public {
      require(msg.sender == idToMarketItem[_tokenId].seller, "Only item seller can perform this operation");
      idToMarketItem[_tokenId].sold = true;
      idToMarketItem[_tokenId].owner = payable(msg.sender);

      _transfer(address(this), msg.sender, _tokenId);
    }

    function infoAboutNFT(uint _tokenId) public view returns (NFTItem memory) {
      return idToMarketItem[_tokenId];
    }
    
    function _processOfBuying(uint _tokenId) private  {
      NFTItem storage item = idToMarketItem[_tokenId];

      item.owner = payable(msg.sender);
      item.sold = true;
      item.seller = payable(address(0));
    }
}