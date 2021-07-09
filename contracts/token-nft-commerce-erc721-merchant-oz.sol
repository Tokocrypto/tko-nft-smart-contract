pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TKONFTMerchant is ERC721URIStorage, Ownable {
    using Strings for uint256;
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor(string memory nameNFT, string memory symbolNFT) ERC721(nameNFT, symbolNFT) {
        _tokenIds.increment();
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return "ipfs://";
    }

    function safeMint(address to, string calldata _tokenURI) external onlyOwner {
        uint256 tokenId = _tokenIds.current();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        _tokenIds.increment();
    }

    function safeMintBatch(address to, string[] calldata _tokenURI) external onlyOwner {
        require(_tokenURI.length > 0, "ERC721: _tokenURI must be granter than zero");
        for (uint256 i = 0; i < _tokenURI.length; i++) {
            uint256 tokenId = _tokenIds.current();
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, _tokenURI[i]);
            _tokenIds.increment();
        }
    }

    function burn(uint256 tokenId) external {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: transfer caller is not owner nor approved");
        _burn(tokenId);
    }

    function burnBatch(uint256[] memory tokenIds) external {
        require(tokenIds.length > 0, "ERC721: tokenIds must be granter than zero");
        address sender = _msgSender();
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_isApprovedOrOwner(sender, tokenIds[i]), "ERC721: transfer caller is not owner nor approved");
            _burn(tokenIds[i]);
        }
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