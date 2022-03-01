// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./IBEP20.sol";
import "./interfaces/interfaceFee.sol";

contract TKONFTMarketplace is Initializable, UUPSUpgradeable, ERC721HolderUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _numAsk;
    AggregatorV3Interface internal priceFeed;

    struct AskEntry {
        address _seller;
        address _contractNFT;
        uint256 _tokenId;
        uint256 _price;
        bool _firstSellingMerchant;
    }

    IBEP20 private tkoContract;
    // Not use anymore, because is proxy
    uint16 private _feeMarketplace; 
    uint16 private _feeOwner;
    uint16 private _feeMerchant;
    uint16 private _feeCollector;
    // Not use anymore, because is proxy
    address private _feeAddress;
    uint256 private _expiredTimes;

    bytes32 public constant OPS_ROLE = keccak256("OPS_ROLE");
    bytes32 public constant MERCHANT_ROLE = keccak256("MERCHANT_ROLE");

    mapping(uint256 => AskEntry) private _NFTSellers;
    mapping(uint256 => bool) private _numAskSellNFT;
    mapping(address => bool) private _suspendCollector;
    mapping(uint256 => bool) private _suspendNFT;
    mapping(address => mapping(uint256 => bool)) private _suspendNFTDetail;
    mapping(address => bool) private _contractNFT;
    mapping(address => mapping(uint256 => address)) private _firstSellingTokens;
    
    uint16 public versionCode;

    IFee interfaceFee;

    event Trade(uint256 indexed ask, address indexed seller, address indexed buyer, address contractNFT, uint256 tokenId, uint256 price);
    event Ask(uint256 indexed ask, address indexed seller, address contractNFT, uint256 tokenId, uint256 price);
    event CancelSellNFT(uint256 indexed ask, address indexed seller, address contractNFT, uint256 tokenId);
    event SuspendNFT(uint256 indexed ask, address indexed contractNFT, uint256 tokenId);
    event ContractNFT(address indexed contractNFT);
    event Fee(uint16 feeMarketplace, uint16 feeOwner, uint16 feeMerchant, uint16 feeCollector);
    event FeeAddress(address indexed feeAddress);
    event SuspendCollector(address indexed adressCollector);
    event SetExpiredTimes(uint256 expiredTimes);
    event LogBuy(address firstSellingToken, bool hasRoleMerchant, bool sellerMerchantRole, bool firstSellingMerchant);

    function initialize(address contractTKO, address feeAddress_, address contractPrice) public initializer {
        _numAsk.increment();
        _feeAddress = feeAddress_;
        tkoContract = IBEP20(contractTKO);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setRoleAdmin(MERCHANT_ROLE, OPS_ROLE);
        _expiredTimes = 10 minutes;
        priceFeed = AggregatorV3Interface(contractPrice);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {
        versionCode += 1;
    }

    function setIFee(address contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        interfaceFee = IFee(contractAddress);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) whenPaused {
        _unpause();
    }

    function setFeeAddress(address feeAddress_) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        _feeAddress = feeAddress_;
        emit FeeAddress(feeAddress_);
    }

    function showFeeAddress() external view returns(address) {
        return _feeAddress;
    }

    function addContractNFT(address contractNFT_) external onlyRole(OPS_ROLE) whenNotPaused {
        _contractNFT[contractNFT_] = true;
        emit ContractNFT(contractNFT_);
    }

    function removeContractNFT(address contractNFT_) external onlyRole(OPS_ROLE) whenNotPaused {
        require(_contractNFT[contractNFT_]);
        delete _contractNFT[contractNFT_];
    }

    function isContractNFT(address contractNFT_) external view returns (bool) {
        return _contractNFT[contractNFT_];
    }

    function suspendCollector(address collector_) external onlyRole(OPS_ROLE) whenNotPaused {
        require(!_suspendCollector[collector_]);
        _suspendCollector[collector_] = true;
        emit SuspendCollector(collector_);
    }

    function unsuspendCollector(address collector_) external onlyRole(OPS_ROLE) whenNotPaused {
        require(_suspendCollector[collector_]);
        delete _suspendCollector[collector_];
    }

    function isSuspendCollector(address collector_) external view returns(bool) {
        return _suspendCollector[collector_];
    }

    function suspendNFTBatch(uint256[] calldata numAsks_) external onlyRole(OPS_ROLE) whenNotPaused {
        for(uint256 i = 0; i < numAsks_.length; i++) {
            require(!_suspendNFT[numAsks_[i]]);
            AskEntry memory NFTSeller = _NFTSellers[numAsks_[i]];
            _suspendNFT[numAsks_[i]] = true;
            _suspendNFTDetail[NFTSeller._contractNFT][NFTSeller._tokenId] = true;
            emit SuspendNFT(numAsks_[i], NFTSeller._contractNFT, NFTSeller._tokenId);
        }
    }

    function unsuspendNFTBatch(uint256[] calldata numAsks_) external onlyRole(OPS_ROLE) whenNotPaused {
        for(uint256 i = 0; i < numAsks_.length; i++) {
            require(_suspendNFT[numAsks_[i]]);
            AskEntry memory NFTSeller = _NFTSellers[numAsks_[i]];
            delete _suspendNFT[numAsks_[i]];
            delete _suspendNFTDetail[NFTSeller._contractNFT][NFTSeller._tokenId];
        }
    }

    function isSuspendNFTBatch(uint256[] calldata numAsks_) external view returns(bool[] memory) {
        bool[] memory boolAsks = new bool[](numAsks_.length);
        for(uint256 i = 0; i < numAsks_.length; i++) {
            boolAsks[i] = _suspendNFT[numAsks_[i]];
        }
        return boolAsks;
    }

    function sellNFTBatch(address contractNFT_, uint256[] calldata tokenIds_, uint256 price_) external whenNotPaused {
        address sender = _msgSender();
        require(price_ > 0);
        require(_contractNFT[contractNFT_]);
        require(!_suspendCollector[sender]);
        for (uint256 i = 0; i < tokenIds_.length; i++) {
            require(!_suspendNFTDetail[contractNFT_][tokenIds_[i]]);
            uint256 numAsk = _numAsk.current();
            address firstSellingToken = _firstSellingTokens[contractNFT_][tokenIds_[i]];
            IERC721(contractNFT_).safeTransferFrom(sender, address(this), tokenIds_[i]);
            _numAskSellNFT[numAsk] = true;
            _numAsk.increment();
            if (firstSellingToken == address(0)) {
                _firstSellingTokens[contractNFT_][tokenIds_[i]] = sender;
            }
            if (hasRole(MERCHANT_ROLE, sender) && firstSellingToken == address(0)) {
                _NFTSellers[numAsk] = AskEntry(sender, contractNFT_, tokenIds_[i], price_, true);
            } else {
                _NFTSellers[numAsk] = AskEntry(sender, contractNFT_, tokenIds_[i], price_, false);
            }
            emit Ask(numAsk, sender, contractNFT_, tokenIds_[i], price_);
        }
    }

    function setCurrentPriceBatch(uint256[] calldata numAsks_, uint256 price_) external whenNotPaused {
        address sender = _msgSender();
        require(price_ > 0);
        require(!_suspendCollector[sender]);
        for (uint256 i = 0; i < numAsks_.length; i++) {
            AskEntry memory NFTSeller = _NFTSellers[numAsks_[i]];
            require(!_suspendNFT[numAsks_[i]]);
            require(NFTSeller._seller == sender);
            require(_numAskSellNFT[numAsks_[i]]);
            _NFTSellers[numAsks_[i]]._price = price_;
            emit Ask(numAsks_[i], sender, NFTSeller._contractNFT, NFTSeller._tokenId, price_);
        }
    }

    function cancelSellNFTBatch(uint256[] calldata numAsks_) external whenNotPaused {
        address sender = _msgSender();
        for (uint256 i = 0; i < numAsks_.length; i++) {
            AskEntry memory NFTSeller = _NFTSellers[numAsks_[i]];
            require(NFTSeller._seller == sender);
            require(_numAskSellNFT[numAsks_[i]]);
            IERC721(NFTSeller._contractNFT).safeTransferFrom(address(this), sender, NFTSeller._tokenId);
            if (_firstSellingTokens[NFTSeller._contractNFT][NFTSeller._tokenId] != address(0) && NFTSeller._firstSellingMerchant) {
                delete _firstSellingTokens[NFTSeller._contractNFT][NFTSeller._tokenId];
            }
            delete _numAskSellNFT[numAsks_[i]];
            delete _NFTSellers[numAsks_[i]];
            emit CancelSellNFT(numAsks_[i], sender, NFTSeller._contractNFT, NFTSeller._tokenId);
        }
    }

    function buyNFT(uint256 numAsk_) external whenNotPaused {
        address sender = _msgSender();
        AskEntry memory NFTSeller = _NFTSellers[numAsk_];
        (
            uint256 price,
            uint256 startedAt,
            uint256 updatedAt,
            // expiredTimes
        ) = getThePrice(numAsk_);
        (
            uint16 feeMarketplace_,
            uint16 feeOwner_,
            uint16 feeMerchant_,
            uint16 feeCollector_
        ) = interfaceFee.getFeeFor(NFTSeller._contractNFT);
        require(!_suspendNFT[numAsk_]);
        require(!_suspendCollector[sender]);
        require(_numAskSellNFT[numAsk_]);
        require(NFTSeller._seller != sender);
        require(updatedAt <= (startedAt + _expiredTimes));
        uint256 feeOwner = (price / 1e4);
        uint256 amountForSeller = price;
        address firstSellingToken = _firstSellingTokens[NFTSeller._contractNFT][NFTSeller._tokenId];
        if (hasRole(MERCHANT_ROLE, NFTSeller._seller) && NFTSeller._firstSellingMerchant) {
            feeOwner *= uint256(feeMarketplace_);
            amountForSeller -= feeOwner;
        } else {
            if (firstSellingToken != address(0) && hasRole(MERCHANT_ROLE, firstSellingToken)) {
                feeOwner *= uint256(feeOwner_);
                uint256 feeMerchant = (price / 1e4) * uint256(feeMerchant_);
                amountForSeller = amountForSeller - feeOwner - feeMerchant;
                tkoContract.transferFrom(sender, firstSellingToken, feeMerchant);
            } else {
                feeOwner *= uint256(feeCollector_);
                amountForSeller -= feeOwner;
            }
        }
        tkoContract.transferFrom(sender, _feeAddress, feeOwner);
        tkoContract.transferFrom(sender, NFTSeller._seller, amountForSeller);
        IERC721(NFTSeller._contractNFT).safeTransferFrom(address(this), sender, NFTSeller._tokenId);
        delete _numAskSellNFT[numAsk_];
        delete _NFTSellers[numAsk_];
        emit Trade(numAsk_, NFTSeller._seller, sender, NFTSeller._contractNFT, NFTSeller._tokenId, price);
        emit LogBuy(firstSellingToken, hasRole(MERCHANT_ROLE, firstSellingToken), hasRole(MERCHANT_ROLE, NFTSeller._seller), NFTSeller._firstSellingMerchant);
    }

    function getAskBatch(uint256[] calldata numAsks_) external view returns(AskEntry[] memory) {
        AskEntry[] memory asks = new AskEntry[](numAsks_.length);
        for(uint256 i = 0; i < numAsks_.length; i++) {
            asks[i] = _NFTSellers[numAsks_[i]];
        }
        return asks;
    }

    function getAsksByPage(uint256 page_, uint256 size_) external view returns(AskEntry[] memory) {
        require(page_ > 0);
        require(size_ > 0);
        uint256 from = ((page_ - 1) * size_) + 1;
        uint256 to = page_ * size_;
        uint256 i = 0;
        AskEntry[] memory asks = new AskEntry[]((to - from + 1));
        for(uint256 a = from;a <= to; a++) {
            asks[i] = _NFTSellers[a];
            i++;
        }
        return asks;
    }

    function setExpiredTimes(uint256 expiredTimes_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _expiredTimes = expiredTimes_ * 1 minutes;
        emit SetExpiredTimes(expiredTimes_);
    }

    function getThePrice(uint256 numAsk_) public view returns(uint256, uint256, uint256, uint256) {
        (
            , // roundId
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            // answeredInRound
        ) = priceFeed.latestRoundData();
        uint256 price = (_NFTSellers[numAsk_]._price * (10 ** (uint256(tkoContract.decimals()) + uint256(priceFeed.decimals())))) / uint256(answer);
        return (price, startedAt, updatedAt, _expiredTimes);
    }
}