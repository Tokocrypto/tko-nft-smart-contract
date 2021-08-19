pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TKONFT is ERC721URIStorage, AccessControl {
    using Strings for uint256;
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Create a new role identifier for the minter role
    bytes32 public constant OPS_ROLE = keccak256("OPS_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    mapping(uint256 => address) private creatorTokenId;
    mapping(uint256 => bool) private verify;

    event Verify(uint256 tokenId);
    event RemoveVerify(uint256 tokenId);

    constructor() ERC721("Tokocrypto NFT", "TKONFT") {
        _tokenIds.increment();
        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(OPS_ROLE, _msgSender());
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setRoleAdmin(MINTER_ROLE, OPS_ROLE);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return "ipfs://";
    }

    function addOpsRole(address addressRole) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRole(OPS_ROLE, addressRole) == false, "ERC721: address has been added in Role");
        _setupRole(OPS_ROLE, addressRole);
    }

    function removeOpsRole(address addressRole) external {
        require(hasRole(OPS_ROLE, addressRole) == true, "ERC721: address has not been added in Role");
        revokeRole(OPS_ROLE, addressRole);
    }

    function addMintRole(address addressRole) external onlyRole(OPS_ROLE) {
        require(hasRole(MINTER_ROLE, addressRole) == false, "ERC721: address has been added in Role");
        _setupRole(MINTER_ROLE, addressRole);
    }

    function removeMintRole(address addressRole) external {
        require(hasRole(MINTER_ROLE, addressRole) == true, "ERC721: address has not been added in Role");
        revokeRole(MINTER_ROLE, addressRole);
    }

    function safeMint(address to, string calldata _tokenURI) external onlyRole(MINTER_ROLE) {
        uint256 tokenId = _tokenIds.current();
        address sender = _msgSender();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        creatorTokenId[tokenId] = sender;
        _tokenIds.increment();
    }

    function safeMintBatch(address to, string[] calldata _tokenURI) external onlyRole(MINTER_ROLE) {
        require(_tokenURI.length > 0, "ERC721: _tokenURI must be granter than zero");
        address sender = _msgSender();
        for (uint256 i = 0; i < _tokenURI.length; i++) {
            uint256 tokenId = _tokenIds.current();
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, _tokenURI[i]);
            creatorTokenId[tokenId] = sender;
            _tokenIds.increment();
        }
    }

    function burn(uint256 tokenId) external {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: transfer caller is not owner nor approved");
        _burn(tokenId);
        delete creatorTokenId[tokenId];
    }

    function burnBatch(uint256[] memory tokenIds) external {
        require(tokenIds.length > 0, "ERC721: tokenIds must be granter than zero");
        address sender = _msgSender();
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_isApprovedOrOwner(sender, tokenIds[i]), "ERC721: transfer caller is not owner nor approved");
            _burn(tokenIds[i]);
            delete creatorTokenId[tokenIds[i]];
        }
    }

    function whoCreator(uint256 tokenId) external view returns (address) {
        return creatorTokenId[tokenId];
    }

    function whoCreatorBatch(uint256[] memory tokenIds) external view returns (address[] memory) {
        address[] memory creatorBatch = new address[](tokenIds.length);
        for(uint256 i = 0; i < tokenIds.length; i++) {
            creatorBatch[i] = creatorTokenId[tokenIds[i]];
        }
        return creatorBatch;
    }

    function newVerify(uint256 tokenId) external onlyRole(OPS_ROLE) {
        require(verify[tokenId] == false, "ERC721: tokenId already verified");
        verify[tokenId] = true;
        emit Verify(tokenId);
    }

    function newVerifyBatch(uint256[] memory tokenIds) external onlyRole(OPS_ROLE) {
        require(tokenIds.length > 0, "ERC721: tokenIds must be granter than zero");
        for(uint256 i = 0; i < tokenIds.length; i++) {
            require(verify[tokenIds[i]] == false, "ERC721: tokenId already verified");
            verify[tokenIds[i]] = true;
            emit Verify(tokenIds[i]);
        }
    }

    function removeVerify(uint256 tokenId) external onlyRole(OPS_ROLE) {
        require(verify[tokenId] == true, "ERC721: tokenId not verified");
        verify[tokenId] = false;
        emit RemoveVerify(tokenId);
    }

    function removeVerifyBatch(uint256[] memory tokenIds) external onlyRole(OPS_ROLE) {
        require(tokenIds.length > 0, "ERC721: tokenIds must be granter than zero");
        for(uint256 i = 0; i < tokenIds.length; i++) {
            require(verify[tokenIds[i]] == true, "ERC721: tokenId not verified");
            delete verify[tokenIds[i]];
        }
    }

    function isVerify(uint256 tokenId) external view returns (bool) {
        return verify[tokenId];
    }

    function isVerifyBatch(uint256[] memory tokenIds) external view returns (bool[] memory) {
        bool[] memory isverify = new bool[](tokenIds.length);
        for(uint256 i = 0; i < tokenIds.length; i++) {
            isverify[i] = verify[tokenIds[i]];
        }
        return isverify;
    }

    function safeTransferFromBatch(address from, address[] memory to, uint256[] memory tokenIds) external {
        safeTransferFromBatch(from, to, tokenIds, "");
    }

    function safeTransferFromBatch(address from, address[] memory to, uint256[] memory tokenIds, bytes memory _data) public {
        require(to.length == tokenIds.length, "ERC721: to and tokenIds not the same length");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_isApprovedOrOwner(_msgSender(), tokenIds[i]), "ERC721: transfer caller is not owner nor approved");
            _safeTransfer(from, to[i], tokenIds[i], _data);
        }
    }

    function transferFromBatch(address from, address[] memory to, uint256[] memory tokenIds) public {
        require(to.length == tokenIds.length, "ERC721: to and tokenIds not the same length");
        address sender = _msgSender();
        for (uint256 i = 0; i < tokenIds.length; i++) {
            //solhint-disable-next-line max-line-length
            require(_isApprovedOrOwner(sender, tokenIds[i]), "ERC721: transfer caller is not owner nor approved");

            _transfer(from, to[i], tokenIds[i]);
        }
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }
}