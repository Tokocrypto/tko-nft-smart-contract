const { assert } = require("chai");

const TKONFTMerchant = artifacts.require('TKONFTMerchant');

contract('TKONFTMerchant', function(accounts) {

  let contract_instance;

  before(async function() {
    contract_instance = await TKONFTMerchant.deployed();
  });

  it('1. Safe Mint', async () => {
    await contract_instance.safeMint(accounts[0], "0x0");
    assert.deepEqual(await contract_instance.ownerOf(1), accounts[0]);
    assert.deepEqual(await contract_instance.tokenURI(1), "ipfs://0x0");
  });

  it('2. Safe Mint Batch', async () => {
    await contract_instance.safeMintBatch(accounts[0], ["0x1", "0x2"]);
    assert.deepEqual(await contract_instance.ownerOf(2), accounts[0]);
    assert.deepEqual(await contract_instance.tokenURI(2), "ipfs://0x1");
    assert.deepEqual(await contract_instance.ownerOf(3), accounts[0]);
    assert.deepEqual(await contract_instance.tokenURI(3), "ipfs://0x2");
  });

  it('3. Transfer From Batch', async () => {
    await contract_instance.transferFromBatch(accounts[0], [accounts[1], accounts[2], accounts[2]], [1, 2, 3]);
    assert.deepEqual(await contract_instance.ownerOf(1), accounts[1]);
    assert.deepEqual(await contract_instance.ownerOf(2), accounts[2]);
    assert.deepEqual(await contract_instance.ownerOf(3), accounts[2]);
  });

  it('4. Safe Transfer From Batch', async () => {
    await contract_instance.safeMintBatch(accounts[0], ["0x3", "0x4"]);
    await contract_instance.safeTransferFromBatch(accounts[0], [accounts[1], accounts[1]], [4, 5]);
    assert.deepEqual(await contract_instance.ownerOf(4), accounts[1]);
    assert.deepEqual(await contract_instance.ownerOf(5), accounts[1]);
  });

  it('5. Safe Transfer From Batch (Bytes Data)', async () => {
    await contract_instance.safeMintBatch(accounts[0], ["0x5", "0x6"]);
    await contract_instance.safeTransferFromBatch(accounts[0], [accounts[1], accounts[1]], [6, 7], "0x00");
    assert.deepEqual(await contract_instance.ownerOf(6), accounts[1]);
    assert.deepEqual(await contract_instance.ownerOf(7), accounts[1]);
  });

  it('6. Exists', async () => {
    assert.deepEqual(await contract_instance.exists(7), true);
  });

  it('7. Burn TokenId', async () => {
    await contract_instance.safeMint(accounts[0], "0x7");
    assert.deepEqual(await contract_instance.ownerOf(8), accounts[0]);
    await contract_instance.burn(8);
    assert.deepEqual(await contract_instance.exists(8), false);
  });

  it('8. Burn Batch TokenId', async () => {
    await contract_instance.safeMintBatch(accounts[0], ["0x8", "0x9"]);
    assert.deepEqual(await contract_instance.ownerOf(9), accounts[0]);
    assert.deepEqual(await contract_instance.ownerOf(10), accounts[0]);
    await contract_instance.burnBatch([9, 10]);
    assert.deepEqual(await contract_instance.exists(9), false);
    assert.deepEqual(await contract_instance.exists(10), false);
  });

});