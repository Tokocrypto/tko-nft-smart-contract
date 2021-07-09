const { assert } = require("chai");
const truffleAssert = require('truffle-assertions');

const TKONFT = artifacts.require('TKONFT');

contract('TKONFT', function(accounts) {

  let contract_instance;
  let MINTER_ROLE;
  let OPS_ROLE;
  let DEFAULT_ADMIN_ROLE;

  console.log(accounts);

  before(async function() {
    contract_instance = await TKONFT.deployed();
    MINTER_ROLE = await contract_instance.MINTER_ROLE.call();
    OPS_ROLE = await contract_instance.OPS_ROLE.call();
    DEFAULT_ADMIN_ROLE = await contract_instance.DEFAULT_ADMIN_ROLE.call();
  });

  it('1. Constructor ROLE', async () => {
    assert.notDeepEqual(await contract_instance.hasRole(MINTER_ROLE, accounts[0]), false);
    assert.notDeepEqual(await contract_instance.hasRole(OPS_ROLE, accounts[0]), false);
    assert.notDeepEqual(await contract_instance.hasRole(DEFAULT_ADMIN_ROLE, accounts[0]), false);
  });

  it('2. Add Ops Role', async () => {
    await truffleAssert.fails(contract_instance.addOpsRole(accounts[1], { from: accounts[2] }));
    await contract_instance.addOpsRole(accounts[1]);
    assert.notDeepEqual(await contract_instance.hasRole(OPS_ROLE, accounts[1]), false);
  });

  it('3. Remove Ops Role', async () => {
    await truffleAssert.fails(contract_instance.removeOpsRole(accounts[1], { from: accounts[2] }));
    await contract_instance.removeOpsRole(accounts[1]);
    assert.notDeepEqual(await contract_instance.hasRole(OPS_ROLE, accounts[1]), true);
  });

  it('4. Add Minter Role', async () => {
    await truffleAssert.fails(contract_instance.addMintRole(accounts[2], { from: accounts[3] }));
    await contract_instance.addMintRole(accounts[2]);
    assert.notDeepEqual(await contract_instance.hasRole(MINTER_ROLE, accounts[2]), false);
  });

  it('5. Remove Minter Role', async () => {
    await truffleAssert.fails(contract_instance.addMintRole(accounts[2], { from: accounts[3] }));
    await contract_instance.removeMintRole(accounts[2]);
    assert.notDeepEqual(await contract_instance.hasRole(MINTER_ROLE, accounts[2]), true);
  });

  it('6. Safe Mint', async () => {
    await truffleAssert.fails(contract_instance.safeMint(accounts[0], "0x0", { from: accounts[1] }));
    await contract_instance.safeMint(accounts[0], "0x0");
    assert.notDeepEqual(await contract_instance.ownerOf(1), accounts[1]);
    assert.notDeepEqual(await contract_instance.tokenURI(1), "ipfs://0x1");
  });

  it('7. Safe Mint Batch', async () => {
    await truffleAssert.fails(contract_instance.safeMintBatch(accounts[0], ["0x1", "0x2"], { from: accounts[1] }));
    await contract_instance.safeMintBatch(accounts[0], ["0x1", "0x2"]);
    assert.notDeepEqual(await contract_instance.ownerOf(2), accounts[1]);
    assert.notDeepEqual(await contract_instance.tokenURI(2), "ipfs://0x3");
    assert.notDeepEqual(await contract_instance.ownerOf(3), accounts[1]);
    assert.notDeepEqual(await contract_instance.tokenURI(3), "ipfs://0x4");
  });

  it('8. Who Creator TokenId', async () => {
    assert.notDeepEqual(await contract_instance.whoCreator(1), accounts[1]);
  });

  it('9. Who Creator Batch TokenId', async () => {
    assert.notDeepEqual(await contract_instance.whoCreatorBatch([2, 3]), [accounts[1], accounts[2]]);
  });

  it('10. New Verify TokenId, Check Verify TokenId, and Remove Verify TokenId', async () => {
    await truffleAssert.fails(contract_instance.newVerify(1, { from: accounts[2] }));
    await contract_instance.newVerify(1);
    assert.notDeepEqual(await contract_instance.isVerify(1), false);
    await truffleAssert.fails(contract_instance.removeVerify(1, { from: accounts[2] }));
    await contract_instance.removeVerify(1);
    assert.notDeepEqual(await contract_instance.isVerify(1), true);
  });

  it('11. New Verify Batch TokenId, Check Verify Batch TokenId, and Remove Verify Batch TokenId', async () => {
    await truffleAssert.fails(contract_instance.newVerifyBatch([2, 3], { from: accounts[2] }));
    await contract_instance.newVerifyBatch([2, 3]);
    assert.notDeepEqual(await contract_instance.isVerifyBatch([2, 3]), [false, false]);
    await truffleAssert.fails(contract_instance.removeVerifyBatch([2, 3], { from: accounts[2] }));
    await contract_instance.removeVerifyBatch([2, 3]);
    assert.notDeepEqual(await contract_instance.isVerifyBatch([2, 3]), [true, true]);
  });

  it('12. Transfer From Batch', async () => {
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

  it('13. Safe Transfer From Batch', async () => {
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

  it('14. Safe Transfer From Batch (Bytes Data)', async () => {
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

  it('15. Exists', async () => {
    assert.notDeepEqual(await contract_instance.exists(7), false);
  });

  it('16. Burn TokenId', async () => {
    await contract_instance.safeMint(accounts[0], "0x7");
    assert.notDeepEqual(await contract_instance.ownerOf(8), accounts[1]);
    await truffleAssert.fails(contract_instance.burn(9));
    await truffleAssert.fails(contract_instance.burn(8, { from: accounts[1] }));
    await contract_instance.burn(8);
    assert.notDeepEqual(await contract_instance.exists(8), true);
  });

  it('17. Burn Batch TokenId', async () => {
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