// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./token-nft-blind-box-set-oz.sol";

contract BlindBoxSetFactory {
    address[] public blindBoxSets;
    mapping(address => address[]) userBlindBoxSets;

    event BlindBoxSetCreated(address indexed owner, address blindBoxSetAddress);

    function createBlindBoxSet(string memory _name, string memory _symbol, uint256 _size, uint256 _lock) external returns (TKONFTBlindBoxSet) {
        TKONFTBlindBoxSet newBlindBoxSet = new TKONFTBlindBoxSet(_name, _symbol, _size, _lock);
        address newBlindBoxSetAddress = address(newBlindBoxSet);
        blindBoxSets.push(newBlindBoxSetAddress);
        userBlindBoxSets[msg.sender].push(newBlindBoxSetAddress);
        newBlindBoxSet.transferOwnership(msg.sender);
        emit BlindBoxSetCreated(msg.sender, newBlindBoxSetAddress);
        return newBlindBoxSet;
    }

    function getBlindBoxSets() external view returns (address[] memory) {
        return blindBoxSets;
    }

    function getBlindBoxSetsByUser(address _user) external view returns (address[] memory) {
        return userBlindBoxSets[_user];
    }
}