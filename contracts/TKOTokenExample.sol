pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TKOTokenExample is ERC20('Tokocrypto Token', 'TKO') {
    constructor() {
        _mint(msg.sender, 500000000e18);
    }
}