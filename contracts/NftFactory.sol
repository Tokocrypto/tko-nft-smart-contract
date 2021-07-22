// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./token-nft-commerce-erc721-merchant-oz.sol";

contract NftFactory {
    address[] public nfts;
    mapping(address => address[]) userNfts;

    event NftCreated(address indexed owner, address nftAddress);

    function createNft(string memory _name, string memory _symbol) public returns (TKONFTMerchant) {
        TKONFTMerchant newNft = new TKONFTMerchant(_name, _symbol);
        address newNftAddress = address(newNft);
        nfts.push(newNftAddress);
        userNfts[msg.sender].push(newNftAddress);
        newNft.transferOwnership(msg.sender);
        emit NftCreated(msg.sender, newNftAddress);
        return newNft;
    }

    function getNfts() public view returns (address[] memory) {
        return nfts;
    }

    function getNftsByUser(address _user) public view returnås (address[] memory) {
        return userNfts[_user];
    }
}