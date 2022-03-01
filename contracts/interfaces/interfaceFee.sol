// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFee {
    function getFeeFor(address contractAddress_)
        external
        view
        returns (
            uint16,
            uint16,
            uint16,
            uint16
        );
}
