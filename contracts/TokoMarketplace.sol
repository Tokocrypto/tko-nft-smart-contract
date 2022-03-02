// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/interfaceManageToken.sol";
import "./interfaces/interfaceOwnable.sol";

contract TokoMarketplace is Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private id;

    IManageToken private interfaceManageToken;

    struct Order {
        string uniqId;
        uint256 nonce;
        address buyer;
        address seller;
        address contractNFT;
        uint256 tokenId;
        address contractToken;
        uint256 price;
        uint256 start;
        uint256 end;
    }

    struct royaltyFee {
        address royaltyReceiver;
        uint256 royalty;
    }

    string public constant nameDomain = "TokoMarketplace";
    bytes32 public constant OPS_ROLE = keccak256("OPS_ROLE");
    uint16 public versionCode;
    address public feeAddress;
    uint256 public platformFee;

    mapping(address => bool) public banned;
    mapping(address => royaltyFee) public customRoyaltyFee;
    mapping(string => bool) public cancelOrDone;
    mapping(uint256 => Order) public orderMatch;

    event AddBannedAddress(address indexed addressOrContract);
    event DeleteBannedAddress(address indexed addressOrContract);
    event SetManagement(address indexed feeAddress, uint256 platformFee, address indexed contractManageToken);
    event RoyaltyFee(address indexed contractNFT, address indexed royaltyReceiver, uint256 indexed royalty);
    event CancelMatch(string indexed uniqId, uint256 indexed nonce);
    event OrderMatch(string indexed uniqId, uint256 indexed nonce, address indexed buyer, address seller, address contractNFT, uint256 tokenId, address contractToken, uint256 price, address royaltyReceiver, uint256 royalty);
    
    function initialize() public initializer {
        id.increment();
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {
        versionCode += 1;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) whenPaused {
        _unpause();
    }

    function setManagement(address feeAddress_, uint256 platformFee_, address contractManageToken_) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(feeAddress_ != address(0), "ERRSM1");
        require(platformFee_ > 0 && platformFee_ <= 1e4, "ERRSM2");
        require(contractManageToken_ != address(0), "ERRSM3");
        feeAddress = feeAddress_;
        interfaceManageToken = IManageToken(contractManageToken_);
        platformFee = platformFee_;
        emit SetManagement(feeAddress_, platformFee_, contractManageToken_);
    }

    function addBannedAddress(address addressOrContract_) external onlyRole(OPS_ROLE) whenNotPaused {
        require(!banned[addressOrContract_], "ERRADA");
        banned[addressOrContract_] = true;
        emit AddBannedAddress(addressOrContract_);
    }

    function deleteBannedAddress(address addressOrContract_) external onlyRole(OPS_ROLE) whenNotPaused {
        require(banned[addressOrContract_], "ERRDBA");
        banned[addressOrContract_] = false;
        emit DeleteBannedAddress(addressOrContract_);
    }

    function setRoyaltyFee(address contractNFT_, address royaltyReceiver_, uint256 royalty_) external {
        address sender = _msgSender();
        require(!banned[sender], "ERRSRF1");
        require(!banned[royaltyReceiver_], "ERRSRF2");
        require(IOwnable(contractNFT_).owner() == sender, "ERRSRF3");
        require(royalty_ <= 2e3, "ERRSRF4");
        customRoyaltyFee[contractNFT_] = royaltyFee(royaltyReceiver_, royalty_);
        emit RoyaltyFee(contractNFT_, royaltyReceiver_, royalty_);
    }

    function cancelMatch(uint8 v_, bytes32 r_, bytes32 s_, Order memory order_) external whenNotPaused nonReentrant {
        order_.seller = _msgSender();
        require(!banned[order_.seller], "ERRCM1");
        require(!banned[order_.contractNFT], "ERRCM2");
        require(signHash(v_, r_, s_, order_), "ERRCM3");
        cancelOrDone[order_.uniqId] = true;
        emit CancelMatch(order_.uniqId, order_.nonce);
    }

    function executeOrderMatch(uint8 v_, bytes32 r_, bytes32 s_, Order memory order_) external payable whenNotPaused nonReentrant {
        address buyer = _msgSender();
        order_.buyer = buyer;
        require(!banned[buyer], "ERREOM1");
        require(!banned[order_.seller], "ERREOM2");
        require(!banned[order_.contractNFT], "ERREOM3");
        require(signHash(v_, r_, s_, order_), "ERREOM4");
        require(feeAddress != address(0), "ERREOM5");
        royaltyFee memory royaltyInfoFee = customRoyaltyFee[order_.contractNFT];
        uint256 _platformFee = order_.price / 1e4 * platformFee;
        uint256 _royalty = royaltyInfoFee.royalty > 0 ? order_.price / 1e4 * royaltyInfoFee.royalty : 0;
        uint256 amountSeller = order_.price - _platformFee - _royalty;
        if (order_.contractToken == address(0)) {
            require(msg.value == order_.price, "ERREOM6");
            AddressUpgradeable.sendValue(payable(order_.seller), amountSeller);
            AddressUpgradeable.sendValue(payable(feeAddress), _platformFee);
            if (_royalty > 0) {
                require(royaltyInfoFee.royaltyReceiver != address(0), "ERREOM7");
                AddressUpgradeable.sendValue(payable(royaltyInfoFee.royaltyReceiver), _royalty);
            }
        } else {
            IERC20Upgradeable token = IERC20Upgradeable(order_.contractToken);
            SafeERC20Upgradeable.safeTransferFrom(token, buyer, order_.seller, amountSeller);
            SafeERC20Upgradeable.safeTransferFrom(token, buyer, feeAddress, _platformFee);
            if (_royalty > 0) {
                require(royaltyInfoFee.royaltyReceiver != address(0), "ERREOM7");
                SafeERC20Upgradeable.safeTransferFrom(token, buyer, royaltyInfoFee.royaltyReceiver, _royalty);
            }
        }
        IERC721(order_.contractNFT).safeTransferFrom(order_.seller, buyer, order_.tokenId);
        cancelOrDone[order_.uniqId] = true;
        orderMatch[id.current()] = order_;
        id.increment();
        emit OrderMatch(order_.uniqId, order_.nonce, buyer, order_.seller, order_.contractNFT, order_.tokenId, order_.contractToken, order_.price, royaltyInfoFee.royaltyReceiver, royaltyInfoFee.royalty);
    }

    function signHash(uint8 v_, bytes32 r_, bytes32 s_, Order memory order_) public view returns(bool) {
        require(!cancelOrDone[order_.uniqId], "ERRSH1");
        require(order_.start < order_.end && (block.timestamp > order_.start && block.timestamp < order_.end), "ERRSH2");
        require(interfaceManageToken.getSupportToken(order_.contractToken), "ERRSH3");
        bytes32 eip712DomainHash = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(nameDomain)),
                keccak256(bytes(Strings.toString(versionCode))),
                block.chainid,
                address(this)
            )
        );  

        bytes32 hashStruct = keccak256(
            abi.encode(
                keccak256(
                    "set(string uniqId,uint256 nonce,address seller,address contractNFT,uint256 tokenId,address contractToken,uint256 price,uint256 start,uint256 end)"
                ),
                keccak256(bytes(order_.uniqId)),
                order_.nonce,
                order_.seller,
                order_.contractNFT,
                order_.tokenId,
                order_.contractToken,
                order_.price,
                order_.start,
                order_.end
            )
        );

        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", eip712DomainHash, hashStruct));
        address signer = ecrecover(hash, v_, r_, s_);
        require(order_.buyer != order_.seller && signer == order_.seller, "ERRSH4");
        require(signer != address(0), "ERRSH5");
        return true;
    }
}