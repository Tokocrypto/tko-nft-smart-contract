pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PriceFeedTKOBIDR is AggregatorV3Interface, Ownable {
    struct pricefeed {
        int256 answer;
        uint256 startedAt;
    }

    uint80 private latestRoundId;
    uint8 private decimals_; 
    string private description_;
    uint256 private version_;

    mapping(uint80 => pricefeed) private tkobidr;
    event Decimals(uint8 indexed decimals);
    event Description(string indexed description);
    event Version(uint256 indexed version);
    event Price(uint80 indexed roundId, int256 answer, uint256 startedAt);

    constructor(uint8 _decimals, string memory _description, uint256 _version) public {
        latestRoundId = 1;
        decimals_ = _decimals;
        description_ = _description;
        version_ = _version;
    }

    function updateDecimals(uint8 _decimals) external onlyOwner {
        decimals_ = _decimals;
        emit Decimals(_decimals);
    }

    function updateDescription(string memory _description) external onlyOwner {
        description_ = _description;
        emit Description(_description);
    }

    function updateVersion(uint256 _version) external onlyOwner {
        version_ = _version;
        emit Version(_version);
    }

    function updatePrice(int256 _answer) external onlyOwner {
        uint256 times = block.timestamp;
        tkobidr[latestRoundId] = pricefeed(_answer, times);
        emit Price(latestRoundId, _answer, times);
        latestRoundId += 1;
    }

    function decimals() external view virtual override returns(uint8) {
        return decimals_;
    }

    function description() external view virtual override returns(string memory) {
        return description_;
    }

    function version() external view virtual override returns(uint256) {
        return version_;
    }

    function getRoundData(uint80 _roundId) external view virtual override returns(uint80, int256, uint256, uint256, uint80) {
        pricefeed memory pf = tkobidr[_roundId];
        return (_roundId, pf.answer, pf.startedAt, block.timestamp, (latestRoundId - 1));
    }

    function latestRoundData() external view virtual override returns(uint80, int256, uint256, uint256, uint80) {
        uint80 _roundId = latestRoundId - 1;
        pricefeed memory pf = tkobidr[_roundId];
        return (_roundId, pf.answer, pf.startedAt, block.timestamp, _roundId);
    }
}