// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IManageToken {
    function getSupportToken(address contractToken_) external view returns(bool);
}