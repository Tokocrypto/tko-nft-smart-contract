const { assert } = require("chai");

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
    assert.deepEqual(await contract_instance.hasRole(MINTER_ROLE, accounts[0]), true);
    assert.deepEqual(await contract_instance.hasRole(OPS_ROLE, accounts[0]), true);
    assert.deepEqual(await contract_instance.hasRole(DEFAULT_ADMIN_ROLE, accounts[0]), true);
  });

  it('2. Add Ops Role', async () => {
    await contract_instance.addOpsRole(accounts[1]);
    assert.deepEqual(await contract_instance.hasRole(OPS_ROLE, accounts[1]), true);
  });

  it('3. Remove Ops Role', async () => {
    await contract_instance.removeOpsRole(accounts[1]);
    assert.deepEqual(await contract_instance.hasRole(OPS_ROLE, accounts[1]), false);
  });

  it('4. Add Minter Role', async () => {
    await contract_instance.addMintRole(accounts[2]);
    assert.deepEqual(await contract_instance.hasRole(MINTER_ROLE, accounts[2]), true);
  });

  it('5. Remove Minter Role', async () => {
    await contract_instance.removeMintRole(accounts[2]);
    assert.deepEqual(await contract_instance.hasRole(MINTER_ROLE, accounts[2]), false);
  });

  it('6. Safe Mint', async () => {
    await contract_instance.safeMint(accounts[0], "0x0");
    assert.deepEqual(await contract_instance.ownerOf(1), accounts[0]);
    assert.deepEqual(await contract_instance.tokenURI(1), "ipfs://0x0");
  });

  it('7. Safe Mint Batch', async () => {
    await contract_instance.safeMintBatch(accounts[0], ["0x1", "0x2"]);
    assert.deepEqual(await contract_instance.ownerOf(2), accounts[0]);
    assert.deepEqual(await contract_instance.tokenURI(2), "ipfs://0x1");
    assert.deepEqual(await contract_instance.ownerOf(3), accounts[0]);
    assert.deepEqual(await contract_instance.tokenURI(3), "ipfs://0x2");
  });

  it('8. Who Creator TokenId', async () => {
    assert.deepEqual(await contract_instance.whoCreator(1), accounts[0]);
  });

  it('9. Who Creator Batch TokenId', async () => {
    assert.deepEqual(await contract_instance.whoCreatorBatch([2, 3]), [accounts[0], accounts[0]]);
  });

  it('10. New Verify TokenId, Check Verify TokenId, and Remove Verify TokenId', async () => {
    await contract_instance.newVerify(1);
    assert.deepEqual(await contract_instance.isVerify(1), true);
    await contract_instance.removeVerify(1);
    assert.deepEqual(await contract_instance.isVerify(1), false);
  });

  it('11. New Verify Batch TokenId, Check Verify Batch TokenId, and Remove Verify Batch TokenId', async () => {
    await contract_instance.newVerifyBatch([2, 3]);
    assert.deepEqual(await contract_instance.isVerifyBatch([2, 3]), [true, true]);
    await contract_instance.removeVerifyBatch([2, 3]);
    assert.deepEqual(await contract_instance.isVerifyBatch([2, 3]), [false, false]);
  });

  it('12. Transfer From Batch', async () => {
    await contract_instance.transferFromBatch(accounts[0], [accounts[1], accounts[2], accounts[2]], [1, 2, 3]);
    assert.deepEqual(await contract_instance.ownerOf(1), accounts[1]);
    assert.deepEqual(await contract_instance.ownerOf(2), accounts[2]);
    assert.deepEqual(await contract_instance.ownerOf(3), accounts[2]);
  });

  it('13. Safe Transfer From Batch', async () => {
    await contract_instance.safeMintBatch(accounts[0], ["0x3", "0x4"]);
    await contract_instance.safeTransferFromBatch(accounts[0], [accounts[1], accounts[1]], [4, 5]);
    assert.deepEqual(await contract_instance.ownerOf(4), accounts[1]);
    assert.deepEqual(await contract_instance.ownerOf(5), accounts[1]);
  });

  it('14. Safe Transfer From Batch (Bytes Data)', async () => {
    await contract_instance.safeMintBatch(accounts[0], ["0x5", "0x6"]);
    await contract_instance.safeTransferFromBatch(accounts[0], [accounts[1], accounts[1]], [6, 7], "0x00");
    assert.deepEqual(await contract_instance.ownerOf(6), accounts[1]);
    assert.deepEqual(await contract_instance.ownerOf(7), accounts[1]);
  });

  it('15. Exists', async () => {
    assert.deepEqual(await contract_instance.exists(7), true);
  });

  it('16. Burn TokenId', async () => {
    await contract_instance.safeMint(accounts[0], "0x7");
    assert.deepEqual(await contract_instance.ownerOf(8), accounts[0]);
    await contract_instance.burn(8);
    assert.deepEqual(await contract_instance.exists(8), false);
  });

  it('17. Burn Batch TokenId', async () => {
    await contract_instance.safeMintBatch(accounts[0], ["0x8", "0x9"]);
    assert.deepEqual(await contract_instance.ownerOf(9), accounts[0]);
    assert.deepEqual(await contract_instance.ownerOf(10), accounts[0]);
    await contract_instance.burnBatch([9, 10]);
    assert.deepEqual(await contract_instance.exists(9), false);
    assert.deepEqual(await contract_instance.exists(10), false);
  });

});