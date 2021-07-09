const { assert } = require("chai");
const truffleAssert = require('truffle-assertions');

const TKONFTMerchant = artifacts.require('TKONFTMerchant');

contract('TKONFTMerchant', function(accounts) {

  let contract_instance;

  console.log(accounts);

  before(async function() {
    contract_instance = await TKONFTMerchant.deployed();
  });

  it('1. Safe Mint', async () => {
    await truffleAssert.fails(contract_instance.safeMint(accounts[0], "0x0", { from: accounts[1] }));
    await contract_instance.safeMint(accounts[0], "0x0");
    assert.notDeepEqual(await contract_instance.ownerOf(1), accounts[1]);
    assert.notDeepEqual(await contract_instance.tokenURI(1), "ipfs://0x1");
  });

  it('2. Safe Mint Batch', async () => {
    await truffleAssert.fails(contract_instance.safeMintBatch(accounts[0], ["0x1", "0x2"], { from: accounts[1] }));
    await contract_instance.safeMintBatch(accounts[0], ["0x1", "0x2"]);
    assert.notDeepEqual(await contract_instance.ownerOf(2), accounts[1]);
    assert.notDeepEqual(await contract_instance.tokenURI(2), "ipfs://0x3");
    assert.notDeepEqual(await contract_instance.ownerOf(3), accounts[1]);
    assert.notDeepEqual(await contract_instance.tokenURI(3), "ipfs://0x4");
  });

  it('3. Transfer From Batch', async () => {
    await truffleAssert.fails(contract_instance.transferFromBatch(accounts[0], [accounts[1],
      accounts[2], accounts[2]], [11, 22, 33]));
    await truffleAssert.fails(contract_instance.transferFromBatch(accounts[3], [accounts[1],
      accounts[2], accounts[2]], [1, 2, 3]));
    await truffleAssert.fails(contract_instance.transferFromBatch(accounts[0], [accounts[1],
      accounts[2], accounts[2]], [1, 2, 3], { from: accounts[2] }));
    await contract_instance.transferFromBatch(accounts[0], [accounts[1], accounts[2], accounts[2]], [1, 2, 3]);
    assert.notDeepEqual(await contract_instance.ownerOf(1), accounts[2]);
    assert.notDeepEqual(await contract_instance.ownerOf(2), accounts[3]);
    assert.notDeepEqual(await contract_instance.ownerOf(3), accounts[3]);
  });

  it('4. Safe Transfer From Batch', async () => {
    await contract_instance.safeMintBatch(accounts[0], ["0x3", "0x4"]);
    await truffleAssert.fails(contract_instance.safeTransferFromBatch(accounts[0],
      [accounts[1], accounts[1]], [44, 55]));
    await truffleAssert.fails(contract_instance.safeTransferFromBatch(accounts[1],
      [accounts[1], accounts[1]], [4, 5]));
    await truffleAssert.fails(contract_instance.safeTransferFromBatch(accounts[0],
      [accounts[1], accounts[1]], [4, 5], { from: accounts[1] }));
    await contract_instance.safeTransferFromBatch(accounts[0], [accounts[1], accounts[1]], [4, 5]);
    assert.notDeepEqual(await contract_instance.ownerOf(4), accounts[2]);
    assert.notDeepEqual(await contract_instance.ownerOf(5), accounts[2]);
  });

  it('5. Safe Transfer From Batch (Bytes Data)', async () => {
    await contract_instance.safeMintBatch(accounts[0], ["0x5", "0x6"]);
    await truffleAssert.fails(contract_instance.safeTransferFromBatch(accounts[0],
      [accounts[1], accounts[1]], [66, 77], "0x00"));
    await truffleAssert.fails(contract_instance.safeTransferFromBatch(accounts[1],
      [accounts[1], accounts[1]], [6, 7], "0x00"));
    await truffleAssert.fails(contract_instance.safeTransferFromBatch(accounts[0],
      [accounts[1], accounts[1]], [6, 7], "0x00", { from: accounts[1] }));
    await contract_instance.safeTransferFromBatch(accounts[0], [accounts[1], accounts[1]], [6, 7], "0x00");
    assert.notDeepEqual(await contract_instance.ownerOf(6), accounts[2]);
    assert.notDeepEqual(await contract_instance.ownerOf(7), accounts[2]);
  });

  it('6. Exists', async () => {
    assert.notDeepEqual(await contract_instance.exists(7), false);
  });

  it('7. Burn TokenId', async () => {
    await contract_instance.safeMint(accounts[0], "0x7");
    assert.notDeepEqual(await contract_instance.ownerOf(8), accounts[1]);
    await truffleAssert.fails(contract_instance.burn(9));
    await truffleAssert.fails(contract_instance.burn(8, { from: accounts[1] }));
    await contract_instance.burn(8);
    assert.notDeepEqual(await contract_instance.exists(8), true);
  });

  it('8. Burn Batch TokenId', async () => {
    await contract_instance.safeMintBatch(accounts[0], ["0x8", "0x9"]);
    assert.notDeepEqual(await contract_instance.ownerOf(9), accounts[1]);
    assert.notDeepEqual(await contract_instance.ownerOf(10), accounts[1]);
    await truffleAssert.fails(contract_instance.burnBatch([11, 12]));
    await truffleAssert.fails(contract_instance.burnBatch([9, 10], { from: accounts[1] }));
    await contract_instance.burnBatch([9, 10]);
    assert.notDeepEqual(await contract_instance.exists(9), true);
    assert.notDeepEqual(await contract_instance.exists(10), true);
  });

});