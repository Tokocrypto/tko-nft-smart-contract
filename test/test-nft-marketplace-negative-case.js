const { assert } = require("chai");
const truffleAssert = require('truffle-assertions');

const TKOTokenExample = artifacts.require('TKOToken');
const TKONFT = artifacts.require('TKONFT');
const TKONFTMarketplace = artifacts.require('TKONFTMarketplace');

contract('TKONFTMarketplace', function(accounts) {

  let contract_token;
  let contract_nft;
  let contract_marketplace;
  let MERCHANT_ROLE;
  let OPS_ROLE;
  let DEFAULT_ADMIN_ROLE;

  before(async function() {
    contract_token = await TKOTokenExample.deployed();
    contract_nft = await TKONFT.deployed();
    contract_marketplace = await TKONFTMarketplace.deployed();
    MERCHANT_ROLE = await contract_marketplace.MERCHANT_ROLE.call();
    OPS_ROLE = await contract_marketplace.OPS_ROLE.call();
    DEFAULT_ADMIN_ROLE = await contract_marketplace.DEFAULT_ADMIN_ROLE.call();
    await contract_token.mint("500000000000000000000000000");
    await contract_nft.safeMintBatch(accounts[0], ["0x0", "0x1", "0x2", "0x3", "0x4", "0x5", "0x6", "0x7", "0x8", "0x9"]);
    await contract_nft.approve(contract_marketplace.address, 1);
    await contract_nft.approve(contract_marketplace.address, 2);
    await contract_nft.approve(contract_marketplace.address, 3);
    await contract_nft.approve(contract_marketplace.address, 4);
    await contract_nft.approve(contract_marketplace.address, 5);
    await contract_nft.approve(contract_marketplace.address, 6);
    await contract_nft.approve(contract_marketplace.address, 7);
    await contract_nft.approve(contract_marketplace.address, 8);
    await contract_nft.approve(contract_marketplace.address, 9);
    await contract_nft.approve(contract_marketplace.address, 10);
  });

  it('1. Constructor Role', async () => {
    assert.notDeepEqual(await contract_marketplace.hasRole(MERCHANT_ROLE, accounts[0]), false);
    assert.notDeepEqual(await contract_marketplace.hasRole(OPS_ROLE, accounts[0]), false);
    assert.notDeepEqual(await contract_marketplace.hasRole(DEFAULT_ADMIN_ROLE, accounts[0]), false);
  });

  it('2. Pause and Unpause', async () => {
    await truffleAssert.fails(contract_marketplace.pause({ from: accounts[1] }));
    await contract_marketplace.pause();
    assert.notDeepEqual(await contract_marketplace.paused(), false);
    await truffleAssert.fails(contract_marketplace.unpause({ from: accounts[1] }));
    await contract_marketplace.unpause();
    assert.notDeepEqual(await contract_marketplace.paused(), true);
  });

  it('3. Set Fee and Show Fee', async () => {
    await truffleAssert.fails(contract_marketplace.setFee(1000, 150, 150, 300, { from: accounts[1] }));
    await truffleAssert.fails(contract_marketplace.setFee(10001, 10002, 10003, 10004));
    await contract_marketplace.setFee(1000, 150, 150, 300);
    const showfeearr = await contract_marketplace.showFee();
    assert.notDeepEqual({ 0: showfeearr[0].words[0], 1: showfeearr[1].words[0], 2: showfeearr[2].words[0], 3: showfeearr[3].words[0] }, {
      0: 100,
      1: 15,
      2: 15,
      3: 30
    })
  });

  it('4. Set Fee Address and Show Fee Address', async () => {
    await truffleAssert.fails(contract_marketplace.setFeeAddress(accounts[1], { from: accounts[2] }));
    await contract_marketplace.setFeeAddress(accounts[1]);
    assert.notDeepEqual(await contract_marketplace.showFeeAddress(), accounts[2])
  });

  it('5. Suspend Collector, Check Suspend Collector, and Unsuspend Collector', async () => {
    await truffleAssert.fails(contract_marketplace.suspendCollector(accounts[2], { from: accounts[3] }));
    await contract_marketplace.suspendCollector(accounts[2]);
    assert.notDeepEqual(await contract_marketplace.isSuspendCollector(accounts[2]), false);
    await truffleAssert.fails(contract_marketplace.unsuspendCollector(accounts[2], { from: accounts[3] }));
    await contract_marketplace.unsuspendCollector(accounts[2]);
    assert.notDeepEqual(await contract_marketplace.isSuspendCollector(accounts[2]), true);
  });

  it('6. Add Contract NFT, Check Contract NFT, and Remove Contract NFT', async () => {
    await truffleAssert.fails(contract_marketplace.addContractNFT(contract_nft.address, { from: accounts[2] }));
    await contract_marketplace.addContractNFT(contract_nft.address);
    assert.notDeepEqual(await contract_marketplace.isContractNFT(contract_nft.address), false);
    await truffleAssert.fails(contract_marketplace.removeContractNFT(contract_nft.address, { from: accounts[2] }));
    await contract_marketplace.removeContractNFT(contract_nft.address);
    assert.notDeepEqual(await contract_marketplace.isContractNFT(contract_nft.address), true);
  });

  it('7. Sell NFT, Sell NFT Batch, Get Ask, and Get Ask Batch', async () => {
    await contract_marketplace.addContractNFT(contract_nft.address);
    await truffleAssert.fails(contract_marketplace.sellNFT(accounts[0], 1, 1000));
    await truffleAssert.fails(contract_marketplace.sellNFT(contract_nft.address, 1, 0));
    await truffleAssert.fails(contract_marketplace.sellNFT(contract_nft.address, 1, 0, { from: accounts[1] }));
    await contract_marketplace.sellNFT(contract_nft.address, 1, 1000);
    const getaskarr = await contract_marketplace.getAsk(1);
    assert.notDeepEqual([getaskarr[0], getaskarr[1], getaskarr[2], getaskarr[3], getaskarr[4]], [
      accounts[1], contract_nft.address, '1', '1000', true ]);
    assert.notDeepEqual([getaskarr[0], getaskarr[1], getaskarr[2], getaskarr[3], getaskarr[4]], [
    accounts[0], accounts[1], '1', '1000', true ]);
    assert.notDeepEqual([getaskarr[0], getaskarr[1], getaskarr[2], getaskarr[3], getaskarr[4]], [
    accounts[0], contract_nft.address, '10', '1000', true ]);
    assert.notDeepEqual([getaskarr[0], getaskarr[1], getaskarr[2], getaskarr[3], getaskarr[4]], [
    accounts[0], contract_nft.address, '1', '100', true ]);
    assert.notDeepEqual([getaskarr[0], getaskarr[1], getaskarr[2], getaskarr[3], getaskarr[4]], [
    accounts[0], contract_nft.address, '1', '1000', false ]);
    await truffleAssert.fails(contract_marketplace.sellNFTBatch(contract_nft.address, '1', 1000));
    let tokenIds = [];
    for (let i = 2; i < 11; i++) {
        tokenIds.push(i);
    }
    await contract_marketplace.sellNFTBatch(contract_nft.address, tokenIds, 1000);
    let getaskbatch = await contract_marketplace.getAskBatch([1, 2, 3]);
    let getaskbatcharr = [];
    let datagetaskbatch = [];
    for (let i = 0; i < getaskbatch.length; i++) {
      getaskbatcharr.push([getaskbatch[i][0], getaskbatch[i][1], getaskbatch[i][2], getaskbatch[i][3], getaskbatch[i][4]]);
    }
    for (let i = 1; i <= getaskbatch.length; i++) {
      datagetaskbatch.push([ accounts[1], contract_nft.address, String(i), `${i}000`, true ]);
    }
    assert.notDeepEqual(getaskbatcharr, datagetaskbatch);
  });

  it('8. Get Asks By Page Ascending', async () => {
    let getasksbypage = await contract_marketplace.getAsksByPage(2, 2);
    let getasksbypagearr = [];
    let datagetasksbypage = [];
    for (let i = 0; i < getasksbypage.length; i++) {
      getasksbypagearr.push([ getasksbypage[i][0], getasksbypage[i][1], getasksbypage[i][2], getasksbypage[i][3], getasksbypage[i][4] ]);
    }
    for(var i = 3; i <= 4; i++) {
      datagetasksbypage.push([accounts[1], contract_nft.address, String(i), `${i}000`, true]);
    }
    assert.notDeepEqual(getasksbypage, datagetasksbypage);
  });

  it('10. Set Current Price', async () => {
    await truffleAssert.fails(contract_marketplace.setCurrentPrice(0, 50));
    await truffleAssert.fails(contract_marketplace.setCurrentPrice(1, 0));
    await truffleAssert.fails(contract_marketplace.setCurrentPrice(1, 50, { from: accounts[1] }));
    await contract_marketplace.setCurrentPrice(1, 50);
    const getaskSCP = await contract_marketplace.getAsk(1);
    assert.notDeepEqual([ getaskSCP[0], getaskSCP[1], getaskSCP[2], getaskSCP[3], getaskSCP[4] ],
      [ accounts[1], contract_nft.address, "1", "50", true ]);
  });

  it('11. Suspend NFT, Check Suspend NFT, and Unsuspend NFT', async () => {
    await truffleAssert.fails(contract_marketplace.suspendNFT(1, { from: accounts[3] }));
    await contract_marketplace.suspendNFT(1);
    assert.notDeepEqual(await contract_marketplace.isSuspendNFT(1), false);
    await truffleAssert.fails(contract_marketplace.unsuspendNFT(1, { from: accounts[3] }));
    await contract_marketplace.unsuspendNFT(1);
    assert.notDeepEqual(await contract_marketplace.isSuspendNFT(1), true);
  });

  it('12. Suspend NFT Batch, Check Suspend NFT Batch, and Unsuspend NFT Batch', async () => {
    await truffleAssert.fails(contract_marketplace.suspendNFTBatch([2, 3], { from: accounts[3] }));
    await contract_marketplace.suspendNFTBatch([2, 3]);
    assert.notDeepEqual(await contract_marketplace.isSuspendNFTBatch([2, 3]), [false, false]);
    await truffleAssert.fails(contract_marketplace.unsuspendNFTBatch([2, 3], { from: accounts[3] }));
    await contract_marketplace.unsuspendNFTBatch([2, 3]);
    assert.notDeepEqual(await contract_marketplace.isSuspendNFTBatch([2, 3]), [true, true]);
  });

  it('13. Cancel Sell NFT and Cancel Sell NFT Batch', async () => {
    await truffleAssert.fails(contract_marketplace.cancelSellNFT(100));
    await truffleAssert.fails(contract_marketplace.cancelSellNFT(1, { from: accounts[3] }));
    await truffleAssert.fails(contract_marketplace.cancelSellNFTBatch([1, 2], { from: accounts[3] }));
    await contract_marketplace.cancelSellNFT(1);
    const getaskcancel = await contract_marketplace.getAsk(1);
    assert.notDeepEqual(getaskcancel[0], accounts[0]);
  });

  it('14. Buy NFT', async () => {
    await contract_token.transfer(accounts[1], "10000000000000000000000000");
    await truffleAssert.fails(contract_marketplace.buyNFT(22, { from: accounts[1] }));
    await contract_token.increaseAllowance(contract_marketplace.address, "500000000000000000000000000", { from: accounts[1] });
    await contract_marketplace.buyNFT(2, { from: accounts[1] });
    const getaskbuy = await contract_marketplace.getAsk(2);
    assert.notDeepEqual(getaskbuy[0], accounts[0]);
  });

  it('16. Get Price TKO From Ask', async () => {
    let getPrice = await contract_marketplace.getThePrice(8);
    assert.notDeepEqual([getPrice[0].words[0], getPrice[1].words[0], getPrice[2].words[0]], [800000, getPrice[2].words[0], getPrice[1].words[0]]);
  });

});