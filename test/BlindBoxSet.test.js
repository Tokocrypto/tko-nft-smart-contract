// jika yang open box bukan owner, maka failed
const { assert } = require("chai");
const truffleAssert = require('truffle-assertions');

const TKONFT = artifacts.require("TKONFT");
const TKONFTMerchant = artifacts.require("TKONFTMerchant");
const TKONFTBlindBoxSet = artifacts.require('TKONFTBlindBoxSet');

contract('TKONFTBlindBoxSet', function(accounts) {

  let contract_nft;
  let contract_nftMerchant;
  let contract_instance;

  before(async function() {
    contract_nft = await TKONFT.deployed();
    contract_nftMerchant = await TKONFTMerchant.deployed();
    contract_instance = await TKONFTBlindBoxSet.deployed();
  });

  it('1. Safe Mint Batch', async () => {
    await contract_nft.safeMintBatch(accounts[0], ["0x1", "0x2", "0x3"]);
    await contract_nftMerchant.safeMintBatch(accounts[0], ["0x1", "0x2", "0x3"]);
    await contract_nft.setApprovalForAll(TKONFTBlindBoxSet.address, true);
    await contract_nftMerchant.setApprovalForAll(TKONFTBlindBoxSet.address, true);
    let txMint = await contract_instance.safeMintBatch(accounts[0], [contract_nft.address, contract_nft.address, contract_nft.address,
      contract_nftMerchant.address, contract_nftMerchant.address, contract_nftMerchant.address], [1, 2, 3, 1, 2, 3]);
    var getMint = 0;
    for (let i = 0; i < txMint.logs.length; i++) {
      if (txMint.logs[i].event == 'Transfer' && txMint.logs[i].args.from == '0x0000000000000000000000000000000000000000') {
        getMint++;
      }
    }
    assert.deepEqual(getMint, 3);
    assert.deepEqual(await contract_instance.ownerOf(1), accounts[0]);
    assert.deepEqual(await contract_instance.ownerOf(2), accounts[0]);
    assert.deepEqual(await contract_instance.ownerOf(3), accounts[0]);
  });

  it('2. Burn Batch', async () => {
    await contract_nft.safeMintBatch(accounts[0], ["0x4"]);
    await contract_nftMerchant.safeMintBatch(accounts[0], ["0x4"]);
    await contract_instance.safeMintBatch(accounts[0], [contract_nft.address, contract_nftMerchant.address], [4, 4]);
    let txBurn = await contract_instance.burnBatch([4], [contract_nft.address, contract_nftMerchant.address], [4, 4]);
    var getBack = 0;
    var getBurn = 0;
    for (let i = 0; i < txBurn.logs.length; i++) {
      if (txBurn.logs[i].event == 'RemoveAssetNFT') {
        getBack++;
      }
      if (txBurn.logs[i].event == 'Transfer' && txBurn.logs[i].args.to == '0x0000000000000000000000000000000000000000') {
        getBurn++;
      }
    }
    assert.deepEqual(getBack, 2);
    assert.deepEqual(getBurn, 1);
  });

  it('3. After Transfer, Canot Minting & Burn', async () => {
    await contract_nft.safeMintBatch(accounts[0], ["0x5", "0x6"]);
    await contract_nftMerchant.safeMintBatch(accounts[0], ["0x5", "0x6"]);
    await contract_instance.safeMintBatch(accounts[0], [contract_nft.address, contract_nft.address, contract_nftMerchant.address, contract_nftMerchant.address], [5, 6, 5, 6]);
    assert.deepEqual(await contract_instance.ownerOf(5), accounts[0]);
    await contract_instance.safeTransferFrom(accounts[0], accounts[1], 5);
    await contract_instance.safeTransferFrom(accounts[1], accounts[0], 5, { from: accounts[1] });
    // Cannot Minting
    await truffleAssert.fails(contract_instance.safeMintBatch(accounts[0], [contract_nft.address, contract_nftMerchant.address], [6, 6]));
    // Cannot Burn
    await truffleAssert.fails(contract_instance.burnBatch([5], [contract_nft.address, contract_nftMerchant.address], [5, 5]));
  });

  it('4. Open Box Batch It Owner (Success)', async () => {
    let txOpen = await contract_instance.openBoxBatch([1]);
    var getOpenBox = 0;
    for (let i = 0; i < txOpen.logs.length; i++) {
      if (txOpen.logs[i].event == 'OpenBox') {
        getOpenBox++;
      }
    }
    assert.deepEqual(getOpenBox, 2);
    await truffleAssert.fails(contract_instance.openBoxBatch([2], { from: accounts[1] }));
  });

  it('5. Open Box Batch It Not Owner (Failed)', async () => {
    await truffleAssert.fails(contract_instance.openBoxBatch([2], { from: accounts[1] }));
  });

  it('6. Box tokenId 1 Already Open & Open Again By Owner Box tokenId 1 (Failed)', async () => {
    await truffleAssert.fails(contract_instance.openBoxBatch([1]));
  });

  it('7. Safe Transfer From Batch', async () => {
    await contract_instance.safeTransferFromBatch(accounts[0], [accounts[1], accounts[1]], [2, 3]);
    assert.deepEqual(await contract_instance.ownerOf(2), accounts[1]);
    assert.deepEqual(await contract_instance.ownerOf(3), accounts[1]);
  });

  it('8. Safe Transfer From Batch (Bytes Data)', async () => {
    await contract_instance.safeTransferFromBatch(accounts[0], [accounts[1], accounts[1]], [5, 6], "0x00");
    assert.deepEqual(await contract_instance.ownerOf(5), accounts[1]);
    assert.deepEqual(await contract_instance.ownerOf(6), accounts[1]);
  });

  it('9. Exists', async () => {
    assert.deepEqual(await contract_instance.exists(3), true);
  });

  it('10. Get Detail', async () => {
    const detail = await contract_instance.getDetail();
    assert.deepEqual([Number(detail[0]), Number(detail[1]), Number(detail[2]), Number(detail[3])],
    [2, 4, 8, Number(detail[3])]);
  });

  it('11. Get Lock Box Batch', async () => {
    let dataLock = await contract_instance.getLockBoxBatch([5, 6]);
    assert.deepEqual([Number(dataLock[0]), Number(dataLock[1])], [Number(dataLock[0]), Number(dataLock[1])]);
  });

});