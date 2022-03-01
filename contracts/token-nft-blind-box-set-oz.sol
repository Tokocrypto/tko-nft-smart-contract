pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TKONFTBlindBoxSet is ERC721, Ownable {
    using Strings for uint256;
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _ids;

    struct EntryNFT {
        address contractNFT;
        uint256 tokenId;
    }

    uint256 private sizeBox;
    uint256 private lockTimes;
    uint256 private unUsedBox;
    uint256[] private ids;
    bool private freezeMintBurn;

    mapping(uint256 => uint256) private lockBox;
    mapping(uint256 => EntryNFT) private assetsNFT;
    mapping(address => mapping(uint256 => uint256)) private idsSave;

    event AddAssetNFT(address contractNFT, uint256 assetNFT);
    event RemoveAssetNFT(address contractNFT, uint256 assetNFT);
    event OpenBox(address indexed who, uint256 tokenId, address contractNFT, uint256 assetNFT);

    constructor(string memory nameNFT, string memory symbolNFT, uint256 size, uint256 lock) ERC721(nameNFT, symbolNFT) {
        sizeBox = size;
        lockTimes = lock * 1 days;
        freezeMintBurn = false;
        _tokenIds.increment();
        _ids.increment();
    }

    modifier onlyNotFreeze {
        require(freezeMintBurn == false, "ERRONF");
        _;
    }

    function safeMintBatch(address to, address[] memory contractNFTs, uint256[] memory assetNFTs) external onlyOwner onlyNotFreeze {
        require(contractNFTs.length == assetNFTs.length, "ERRSMB1");
        require((assetNFTs.length % sizeBox) == 0, "ERRSMB2");
        address sender = _msgSender();
        for (uint256 i = 0; i < assetNFTs.length; i++) {
            ERC721(contractNFTs[i]).transferFrom(sender, address(this), assetNFTs[i]);
            uint256 id = _ids.current();
            ids.push(id);
            assetsNFT[id] = EntryNFT(contractNFTs[i], assetNFTs[i]);
            idsSave[contractNFTs[i]][assetNFTs[i]] = id;
            _ids.increment();
            emit AddAssetNFT(contractNFTs[i], assetNFTs[i]);
        }
        for (uint256 a = 0; a < (assetNFTs.length / sizeBox); a++) {
            _safeMint(to, _tokenIds.current());
            _tokenIds.increment();
            unUsedBox++;
        }
    }

    function burnBatch(uint256[] memory tokenIds, address[] memory contractNFTs, uint256[] memory assetNFTs) external onlyOwner onlyNotFreeze {
        require(contractNFTs.length == assetNFTs.length, "ERRBB1");
        require(contractNFTs.length == (tokenIds.length * sizeBox), "ERRBB2");
        address sender = _msgSender();
        uint256[] memory saveArr = new uint256[](assetNFTs.length);
        for (uint256 i = 0; i < assetNFTs.length; i++) {
            ERC721(contractNFTs[i]).transferFrom(address(this), sender, assetNFTs[i]);
            saveArr[i] = idsSave[contractNFTs[i]][assetNFTs[i]];
            delete idsSave[contractNFTs[i]][assetNFTs[i]];
            emit RemoveAssetNFT(contractNFTs[i], assetNFTs[i]);
        }
        for (uint256 a = 0; a < ids.length; a++) {
            for (uint256 b = 0; b < saveArr.length; b++) {
                if (ids[a] == saveArr[b]) {
                    delete assetsNFT[ids[a]];
                    ids[a] = ids[ids.length - 1];
                    ids.pop();
                }
            }
        }
        for (uint256 c = 0; c < tokenIds.length; c++) {
            require(_isApprovedOrOwner(sender, tokenIds[c]), "ERRBB3");
            _burn(tokenIds[c]);
            unUsedBox--;
        }
    }

    function openBoxBatch(uint256[] memory tokenIds) external {
        require(tokenIds.length > 0, "ERROBB1");
        address sender = _msgSender();
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(block.timestamp > lockBox[tokenIds[i]], "ERROBB2");
            require(_isApprovedOrOwner(sender, tokenIds[i]), "ERROBB3");
            _burn(tokenIds[i]);
            unUsedBox--;
            for (uint256 a = 0; a < sizeBox; a++) {
                uint256 randomNumber = random(0, (ids.length - 1));
                EntryNFT memory nft = assetsNFT[ids[randomNumber]];
                ERC721(nft.contractNFT).transferFrom(address(this), sender, nft.tokenId);
                emit OpenBox(sender, tokenIds[i], nft.contractNFT, nft.tokenId);
                ids[randomNumber] = ids[ids.length - 1];
                ids.pop();
            }
        }
    }

    function safeTransferFromBatch(address from, address[] memory to, uint256[] memory tokenIds) external {
        safeTransferFromBatch(from, to, tokenIds, "");
    }

    function safeTransferFromBatch(address from, address[] memory to, uint256[] memory tokenIds, bytes memory _data) public {
        require(to.length == tokenIds.length, "ERRSTFB1");
        if (freezeMintBurn == false) {
            freezeMintBurn = true;
        }
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_isApprovedOrOwner(_msgSender(), tokenIds[i]), "ERRSTFB2");
            _safeTransfer(from, to[i], tokenIds[i], _data);
            lockBox[tokenIds[i]] = block.timestamp + lockTimes;
        }
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        if (freezeMintBurn == false) {
            freezeMintBurn = true;
        }
        super.transferFrom(from, to, tokenId);
        lockBox[tokenId] = block.timestamp + lockTimes;
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        if (freezeMintBurn == false) {
            freezeMintBurn = true;
        }
        super.safeTransferFrom(from, to, tokenId, "");
        lockBox[tokenId] = block.timestamp + lockTimes;
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) public override {
        if (freezeMintBurn == false) {
            freezeMintBurn = true;
        }
        super.safeTransferFrom(from, to, tokenId, _data);
        lockBox[tokenId] = block.timestamp + lockTimes;
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    function getDetail() external view returns(uint256, uint256, uint256, uint256) {
        return (sizeBox, unUsedBox, ids.length, lockTimes);
    }

    function getLockBoxBatch(uint256[] memory tokenIds) external view returns(uint256[] memory) {
        uint256[] memory lockBoxs = new uint256[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            lockBoxs[i] = lockBox[tokenIds[i]];
        }
        return lockBoxs;
    }

    function random(uint256 start_, uint256 end_) internal view returns(uint256) {
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % (end_ + 1);
        if (randomNumber < start_) {
            randomNumber = randomNumber + start_;
        }
        return randomNumber;
    }
}