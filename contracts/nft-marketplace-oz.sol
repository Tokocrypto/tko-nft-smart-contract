pragma solidity ^0.8.0;

import "./IBEP20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract TKONFTMarketplace is ERC721Holder, AccessControl, Pausable {
    using Counters for Counters.Counter;
    Counters.Counter private _numAsk;
    AggregatorV3Interface internal priceFeed;

    struct AskEntry {
        address _seller;
        address _contractNFT;
        uint256 _tokenId;
        uint256 _price;
        bool _firstSellingMerchant;
    }
    
    IBEP20 private tkoContract;
    uint256 private _feeMarketplace;
    uint256 private _feeOwner;
    uint256 private _feeMerchant;
    uint256 private _feeCollector;
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

    event Trade(uint256 indexed ask, address indexed seller, address indexed buyer, address contractNFT, uint256 tokenId, uint256 price);
    event Ask(uint256 indexed ask, address indexed seller, address contractNFT, uint256 tokenId, uint256 price);
    event CancelSellNFT(uint256 indexed ask, address indexed seller, address contractNFT, uint256 tokenId);
    event SuspendNFT(uint256 indexed ask, address indexed contractNFT, uint256 tokenId);
    event ContractNFT(address indexed contractNFT);

    constructor(address contractTKO, address feeAddress_, address contractPrice) {
        _numAsk.increment();
        _feeAddress = feeAddress_;
        tkoContract = IBEP20(contractTKO);
        _setupRole(OPS_ROLE, _msgSender());
        _setupRole(MERCHANT_ROLE, _msgSender());
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setRoleAdmin(MERCHANT_ROLE, OPS_ROLE);
        _expiredTimes = 10 minutes;
        priceFeed = AggregatorV3Interface(contractPrice);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) whenPaused {
        _unpause();
    }

    function setFee(uint256 feeMarketplace_, uint256 feeOwner_, uint256 feeMerchant_, uint256 feeCollector_) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(feeMarketplace_ <= 1e4);
        require(feeOwner_ <= 1e4);
        require(feeMerchant_ <= 1e4);
        require(feeCollector_ <= 1e4);
        _feeMarketplace = feeMarketplace_;
        _feeOwner = feeOwner_;
        _feeMerchant = feeMerchant_;
        _feeCollector = feeCollector_;
    }

    function showFee() external view returns(uint256, uint256, uint256, uint256) {
        return (_feeMarketplace, _feeOwner, _feeMerchant, _feeCollector);
    }

    function setFeeAddress(address feeAddress_) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        _feeAddress = feeAddress_;
    }

    function showFeeAddress() external view returns(address) {
        return _feeAddress;
    }

    function addContractNFT(address contractNFT_) external onlyRole(OPS_ROLE) whenNotPaused {
        _contractNFT[contractNFT_] = true;
        emit ContractNFT(contractNFT_);
    }

    function removeContractNFT(address contractNFT_) external onlyRole(OPS_ROLE) whenNotPaused {
        require(_contractNFT[contractNFT_] == true);
        delete _contractNFT[contractNFT_];
    }

    function isContractNFT(address contractNFT_) external view returns (bool) {
        return _contractNFT[contractNFT_];
    }

    function suspendCollector(address collector_) external onlyRole(OPS_ROLE) whenNotPaused {
        require(_suspendCollector[collector_] == false);
        _suspendCollector[collector_] = true;
    }

    function unsuspendCollector(address collector_) external onlyRole(OPS_ROLE) whenNotPaused {
        require(_suspendCollector[collector_] == true);
        delete _suspendCollector[collector_];
    }

    function isSuspendCollector(address collector_) external view returns(bool) {
        return _suspendCollector[collector_];
    }

    function suspendNFT(uint256 numAsk_) external onlyRole(OPS_ROLE) whenNotPaused {
        require(_suspendNFT[numAsk_] == false);
        AskEntry memory NFTSeller = _NFTSellers[numAsk_];
        _suspendNFT[numAsk_] = true;
        _suspendNFTDetail[NFTSeller._contractNFT][NFTSeller._tokenId] = true;
        emit SuspendNFT(numAsk_, NFTSeller._contractNFT, NFTSeller._tokenId);
    }

    function suspendNFTBatch(uint256[] memory numAsks_) external onlyRole(OPS_ROLE) whenNotPaused {
        for(uint256 i = 0; i < numAsks_.length; i++) {
            require(_suspendNFT[numAsks_[i]] == false);
            _suspendNFT[numAsks_[i]] = true;
            _suspendNFTDetail[_NFTSellers[numAsks_[i]]._contractNFT][_NFTSellers[numAsks_[i]]._tokenId] = true;
            emit SuspendNFT(numAsks_[i], _NFTSellers[numAsks_[i]]._contractNFT, _NFTSellers[numAsks_[i]]._tokenId);
        }
    }

    function unsuspendNFT(uint256 numAsk_) external onlyRole(OPS_ROLE) whenNotPaused {
        require(_suspendNFT[numAsk_] == true);
        AskEntry memory NFTSeller = _NFTSellers[numAsk_];
        delete _suspendNFT[numAsk_];
        delete _suspendNFTDetail[NFTSeller._contractNFT][NFTSeller._tokenId];
    }

    function unsuspendNFTBatch(uint256[] memory numAsks_) external onlyRole(OPS_ROLE) whenNotPaused {
        for(uint256 i = 0; i < numAsks_.length; i++) {
            require(_suspendNFT[numAsks_[i]] == true);
            delete _suspendNFT[numAsks_[i]];
            delete _suspendNFTDetail[_NFTSellers[numAsks_[i]]._contractNFT][_NFTSellers[numAsks_[i]]._tokenId];
        }
    }

    function isSuspendNFT(uint256 numAsk_) public view returns(bool) {
        return _suspendNFT[numAsk_];
    }

    function isSuspendNFTBatch(uint256[] memory numAsks_) public view returns(bool[] memory) {
        bool[] memory boolAsks = new bool[](numAsks_.length);
        for(uint256 i = 0; i < numAsks_.length; i++) {
            boolAsks[i] = _suspendNFT[numAsks_[i]];
        }
        return boolAsks;
    }

    function sellNFT(address contractNFT_, uint256 tokenId_, uint256 price_) public whenNotPaused {
        address sender = _msgSender();
        require(price_ > 0);
        require(_contractNFT[contractNFT_] == true);
        require(_suspendCollector[sender] == false);
        require(_suspendNFTDetail[contractNFT_][tokenId_] == false);
        uint256 numAsk = _numAsk.current();
        IERC721(contractNFT_).safeTransferFrom(sender, address(this), tokenId_);
        _numAskSellNFT[numAsk] = true;
        _numAsk.increment();
        if (hasRole(MERCHANT_ROLE, sender) == true && _firstSellingTokens[contractNFT_][tokenId_] == address(0)) {
            _firstSellingTokens[contractNFT_][tokenId_] = sender;
            _NFTSellers[numAsk] = AskEntry(sender, contractNFT_, tokenId_, price_, true);
        } else {
            _NFTSellers[numAsk] = AskEntry(sender, contractNFT_, tokenId_, price_, false);
        }
        emit Ask(numAsk, sender, contractNFT_, tokenId_, price_);
    }

    function sellNFTBatch(address contractNFT_, uint256[] memory tokenIds_, uint256 price_) external {
        for (uint256 i = 0; i < tokenIds_.length; i++) {
            sellNFT(contractNFT_, tokenIds_[i], price_);
        }
    }

    function setCurrentPrice(uint256 numAsk_, uint256 price_) public whenNotPaused {
        address sender = _msgSender();
        AskEntry memory NFTSeller = _NFTSellers[numAsk_];
        require(price_ > 0);
        require(_suspendNFT[numAsk_] == false);
        require(_suspendCollector[sender] == false);
        require(NFTSeller._seller == sender);
        require(_numAskSellNFT[numAsk_] == true);
        _NFTSellers[numAsk_]._price = price_;
        emit Ask(numAsk_, sender, NFTSeller._contractNFT, NFTSeller._tokenId, price_);
    }

    function setCurrentPriceBatch(uint256[] memory numAsks_, uint256 price_) external {
        for (uint256 i = 0; i < numAsks_.length; i++) {
            setCurrentPrice(numAsks_[i], price_);
        }
    }

    function cancelSellNFT(uint256 numAsk_) public whenNotPaused {
        address sender = _msgSender();
        AskEntry memory NFTSeller = _NFTSellers[numAsk_];
        require(NFTSeller._seller == sender);
        require(_numAskSellNFT[numAsk_] == true);
        IERC721(NFTSeller._contractNFT).safeTransferFrom(address(this), sender, NFTSeller._tokenId);
        delete _numAskSellNFT[numAsk_];
        delete _NFTSellers[numAsk_];
        emit CancelSellNFT(numAsk_, sender, NFTSeller._contractNFT, NFTSeller._tokenId);
    }

    function cancelSellNFTBatch(uint256[] memory numAsks_) external {
        for (uint256 i = 0; i < numAsks_.length; i++) {
            cancelSellNFT(numAsks_[i]);
        }
    }

    function buyNFT(uint256 numAsk_) external whenNotPaused {
        address sender = _msgSender();
        AskEntry memory NFTSeller = _NFTSellers[numAsk_];
        (
            uint256 price,
            uint256 startedAt,
            uint256 updatedAt
        ) = getThePrice(numAsk_);
        require(_suspendNFT[numAsk_] == false);
        require(_suspendCollector[sender] == false);
        require(_numAskSellNFT[numAsk_] == true);
        require(NFTSeller._seller != sender);
        require(updatedAt <= (startedAt + _expiredTimes));
        uint256 feeOwner = (price / 1e4);
        uint256 amountForSeller = price;
        if (hasRole(MERCHANT_ROLE, NFTSeller._seller) == true && NFTSeller._firstSellingMerchant == true) {
            feeOwner *= _feeMarketplace;
            amountForSeller -= feeOwner;
        } else {
            if (_firstSellingTokens[NFTSeller._contractNFT][NFTSeller._tokenId] != address(0)) {
                feeOwner *= _feeOwner;
                uint256 feeMerchant = (price / 1e4) * _feeMerchant;
                amountForSeller = amountForSeller - feeOwner - feeMerchant;
                tkoContract.transferFrom(sender, _firstSellingTokens[NFTSeller._contractNFT][NFTSeller._tokenId], feeMerchant);
            } else {
                feeOwner *= _feeCollector;
                amountForSeller -= feeOwner;
            }
        }
        tkoContract.transferFrom(sender, _feeAddress, feeOwner);
        tkoContract.transferFrom(sender, NFTSeller._seller, amountForSeller);
        IERC721(NFTSeller._contractNFT).safeTransferFrom(address(this), sender, NFTSeller._tokenId);
        delete _numAskSellNFT[numAsk_];
        delete _NFTSellers[numAsk_];
        emit Trade(numAsk_, NFTSeller._seller, sender, NFTSeller._contractNFT, NFTSeller._tokenId, price);
    }

    function getAsk(uint256 numAsk_) external view returns(AskEntry memory) {
        return _NFTSellers[numAsk_];
    }

    function getAskBatch(uint256[] memory numAsks_) external view returns(AskEntry[] memory) {
        AskEntry[] memory asks = new AskEntry[](numAsks_.length);
        for(uint256 i = 0;i < numAsks_.length; i++) {
            asks[i] = AskEntry(_NFTSellers[numAsks_[i]]._seller, _NFTSellers[numAsks_[i]]._contractNFT,
            _NFTSellers[numAsks_[i]]._tokenId, _NFTSellers[numAsks_[i]]._price, _NFTSellers[numAsks_[i]]._firstSellingMerchant);
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
            asks[i] = AskEntry(_NFTSellers[a]._seller, _NFTSellers[a]._contractNFT,
            _NFTSellers[a]._tokenId, _NFTSellers[a]._price, _NFTSellers[a]._firstSellingMerchant);
            i++;
        }
        return asks;
    }

    function getAsksByPageDesc(uint256 page_, uint256 size_) external view returns(AskEntry[] memory) {
        require(page_ > 0);
        require(size_ > 0);
        uint256 numAsk = _numAsk.current() - 1;
        uint256 from = numAsk - ((page_ - 1) * size_);
        uint256 to = numAsk - (page_ * size_) + 1;
        uint256 i = 0;
        AskEntry[] memory asks = new AskEntry[]((from - to + 1));
        for(uint256 a = from;a >= to; a--) {
            asks[i] = AskEntry(_NFTSellers[a]._seller, _NFTSellers[a]._contractNFT,
            _NFTSellers[a]._tokenId, _NFTSellers[a]._price, _NFTSellers[a]._firstSellingMerchant);
            i++;
        }
        return asks;
    }

    function setExpiredTimes(uint256 expiredTimes_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _expiredTimes = expiredTimes_ * 1 minutes;
    }

    function expiredTimes() external view returns(uint256, uint256, uint256) {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        return (startedAt, updatedAt, _expiredTimes);
    }

    function getThePrice(uint256 numAsk_) public view returns(uint256, uint256, uint256) {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        uint8 decimalsPF = priceFeed.decimals();
        uint256 price = (_NFTSellers[numAsk_]._price * (10 ** uint256(tkoContract.decimals()))) / uint256(answer) / (10 ** uint256(decimalsPF));
        return (price, startedAt, updatedAt);
    }
}