// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/interfaceManageToken.sol";
import "./IBEP20.sol";

contract ManageToken is Ownable, IManageToken {
    mapping(address => bool) private supportedToken;

    event AddToken(address indexed contractToken, string indexed nameToken, string indexed symbolToken);
    event DeleteToken(address indexed contractToken, string indexed nameToken, string indexed symbolToken);

    constructor() {
        supportedToken[address(0)] = true;
    }

    function addToken(address contractToken_) external onlyOwner {
        require(!supportedToken[contractToken_], "Registered token");
        supportedToken[contractToken_] = true;
        IBEP20 bep20 = IBEP20(contractToken_);
        emit AddToken(contractToken_, bep20.name(), bep20.symbol());
    }

    function deleteToken(address contractToken_) external onlyOwner {
        require(supportedToken[contractToken_], "Unregistered token");
        delete supportedToken[contractToken_];
        IBEP20 bep20 = IBEP20(contractToken_);
        emit DeleteToken(contractToken_, bep20.name(), bep20.symbol());
    }

    function getSupportToken(address contractToken_) external view override returns(bool) {
        return supportedToken[contractToken_];
    }
}