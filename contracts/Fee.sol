// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/interfaceFee.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Fee is IFee, AccessControl {
    struct CustomFee {
        uint16 feeMarketplace;
        uint16 feeOwner;
        uint16 feeMerchant;
        bool hasCustomFee;
    }

    uint16 private _feeMarketplace;
    uint16 private _feeOwner;
    uint16 private _feeMerchant;
    uint16 private _feeCollector;

    bytes32 public constant OPS_ROLE = keccak256("OPS_ROLE");

    mapping(address => CustomFee) private fees;

    event SetDefaultFee(
        uint16 feeMarketplace,
        uint16 feeOwner,
        uint16 feeMerchant,
        uint16 feeCollector
    );

    event SetCustomFee(
        address contractAddress,
        uint16 feeMarketplace,
        uint16 feeOwner,
        uint16 feeMerchant
    );

    event RemoveCustomFee(address contractAddress);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function hasCustomFee(address contractAddress_) public view returns (bool) {
        return fees[contractAddress_].hasCustomFee;
    }

    function setDefaultFee(
        uint16 feeMarketplace_,
        uint16 feeOwner_,
        uint16 feeMerchant_,
        uint16 feeCollector_
    ) external onlyRole(OPS_ROLE) {
        require(
            feeMarketplace_ <= 1e4,
            "Fee Marketplace cannot be more than 1e4"
        );
        require(feeOwner_ <= 1e4, "Fee Owner cannot be more than 1e4");
        require(feeMerchant_ <= 1e4, "Fee Merchant cannot be more than 1e4");
        require(feeCollector_ <= 1e4, "Fee Collector cannot be more than 1e4");

        _feeMarketplace = feeMarketplace_;
        _feeOwner = feeOwner_;
        _feeMerchant = feeMerchant_;
        _feeCollector = feeCollector_;

        emit SetDefaultFee(
            feeMarketplace_,
            feeOwner_,
            feeMerchant_,
            feeCollector_
        );
    }

    function setFeeFor(
        address contractAddress_,
        uint16 feeMarketplace_,
        uint16 feeOwner_,
        uint16 feeMerchant_
    ) external onlyRole(OPS_ROLE) {
        require(
            feeMarketplace_ <= 1e4,
            "Fee Marketplace cannot be more than 1e4"
        );
        require(feeOwner_ <= 1e4, "Fee Owner cannot be more than 1e4");
        require(feeMerchant_ <= 1e4, "Fee Merchant cannot be more than 1e4");
        fees[contractAddress_] = CustomFee(
            feeMarketplace_,
            feeOwner_,
            feeMerchant_,
            true
        );
        emit SetCustomFee(
            contractAddress_,
            feeMarketplace_,
            feeOwner_,
            feeMerchant_
        );
    }

    function removeFeeFor(address contractAddress_)
        external
        onlyRole(OPS_ROLE)
    {
        delete fees[contractAddress_];
        emit RemoveCustomFee(contractAddress_);
    }

    function getDefaultFee()
        external
        view
        returns (
            uint16,
            uint16,
            uint16,
            uint16
        )
    {
        return (_feeMarketplace, _feeOwner, _feeMerchant, _feeCollector);
    }

    function getFeeFor(address contractAddress_)
        external
        view
        override
        returns (
            uint16,
            uint16,
            uint16,
            uint16
        )
    {
        if (hasCustomFee(contractAddress_)) {
            CustomFee memory customFee = fees[contractAddress_];
            return (
                customFee.feeMarketplace,
                customFee.feeOwner,
                customFee.feeMerchant,
                _feeCollector
            );
        }
        return (_feeMarketplace, _feeOwner, _feeMerchant, _feeCollector);
    }
}
