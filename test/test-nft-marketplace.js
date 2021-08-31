const { assert } = require("chai");
const truffleAssert = require('truffle-assertions');

const TKOTokenExample = artifacts.require('TKOToken');
const TKONFT = artifacts.require('TKONFT');
const TKONFTMarketplace = artifacts.require('TKONFTMarketplace');

contract('TKONFTMarketplace', function (accounts) {

  let contract_token;
  let contract_nft;
  let contract_marketplace;
  let MERCHANT_ROLE;
  let OPS_ROLE;
  let DEFAULT_ADMIN_ROLE;

  before(async function () {
    contract_token = await TKOTokenExample.deployed();
    contract_nft = await TKONFT.deployed();
    contract_marketplace = await TKONFTMarketplace.deployed();
    MERCHANT_ROLE = await contract_marketplace.MERCHANT_ROLE.call();
    OPS_ROLE = await contract_marketplace.OPS_ROLE.call();
    DEFAULT_ADMIN_ROLE = await contract_marketplace.DEFAULT_ADMIN_ROLE.call();
    await contract_token.mint("500000000000000000000000000");
    await contract_nft.safeMintBatch(accounts[0], ["0x0", "0x1", "0x2", "0x3", "0x4", "0x5", "0x6", "0x7", "0x8", "0x9"]);
    await contract_nft.setApprovalForAll(contract_marketplace.address, true);
  });

  it('1. Initialize', async () => {
    assert.deepEqual(await contract_marketplace.hasRole(MERCHANT_ROLE, accounts[0]), true);
    assert.deepEqual(await contract_marketplace.hasRole(OPS_ROLE, accounts[0]), true);
    assert.deepEqual(await contract_marketplace.hasRole(DEFAULT_ADMIN_ROLE, accounts[0]), true);
  });

  it('2. Pause and Unpause', async () => {
    await contract_marketplace.pause();
    assert.deepEqual(await contract_marketplace.paused(), true);
    await contract_marketplace.unpause();
    assert.deepEqual(await contract_marketplace.paused(), false);
  });

  it('3. Set Fee and Show Fee', async () => {
    truffleAssert.eventEmitted(await contract_marketplace.setFee(1000, 150, 150, 300), 'Fee');
    const showfeearr = await contract_marketplace.showFee();
    assert.deepEqual({ 0: Number(showfeearr[0]), 1: Number(showfeearr[1]), 2: Number(showfeearr[2]), 3: Number(showfeearr[3]) }, {
      0: 1000,
      1: 150,
      2: 150,
      3: 300
    });
  });

  it('4. Set Fee Address and Show Fee Address', async () => {
    truffleAssert.eventEmitted(await contract_marketplace.setFeeAddress(accounts[2]), 'FeeAddress');
    assert.deepEqual(await contract_marketplace.showFeeAddress(), accounts[2])
  });

  it('5. Suspend Collector, Check Suspend Collector, and Unsuspend Collector', async () => {
    truffleAssert.eventEmitted(await contract_marketplace.suspendCollector(accounts[2]), 'SuspendCollector');
    assert.deepEqual(await contract_marketplace.isSuspendCollector(accounts[2]), true);
    await contract_marketplace.unsuspendCollector(accounts[2]);
    assert.deepEqual(await contract_marketplace.isSuspendCollector(accounts[2]), false);
  });

  it('6. Add Contract NFT, Check Contract NFT, and Remove Contract NFT', async () => {
    truffleAssert.eventEmitted(await contract_marketplace.addContractNFT(contract_nft.address), 'ContractNFT');
    assert.deepEqual(await contract_marketplace.isContractNFT(contract_nft.address), true);
    await contract_marketplace.removeContractNFT(contract_nft.address);
    assert.deepEqual(await contract_marketplace.isContractNFT(contract_nft.address), false);
  });

  it('7. Sell NFT Batch and Get Ask Batch', async () => {
    await contract_marketplace.addContractNFT(contract_nft.address);
    truffleAssert.eventEmitted(await contract_marketplace.sellNFTBatch(contract_nft.address, [1], 10000, { from: accounts[0] }), 'Ask');
    const getaskarr = await contract_marketplace.getAskBatch([1]);
    assert.deepEqual([getaskarr[0][0], getaskarr[0][1], getaskarr[0][2], getaskarr[0][3], getaskarr[0][4]], [
      accounts[0], contract_nft.address, '1', '10000', true]);
    let tokenIds = [];
    for (let i = 2; i < 11; i++) {
      tokenIds.push(i);
    }
    await contract_marketplace.sellNFTBatch(contract_nft.address, tokenIds, 10000);
    let getaskbatch = await contract_marketplace.getAskBatch([1, 2, 3]);
    let getaskbatcharr = [];
    let datagetaskbatch = [];
    for (let i = 0; i < getaskbatch.length; i++) {
      getaskbatcharr.push([getaskbatch[i][0], getaskbatch[i][1], getaskbatch[i][2], getaskbatch[i][3], getaskbatch[i][4]]);
    }
    for (let i = 1; i <= getaskbatch.length; i++) {
      datagetaskbatch.push([accounts[0], contract_nft.address, String(i), "10000", true]);
    }
    assert.deepEqual(getaskbatcharr, datagetaskbatch);
  });

  it('8. Get Asks By Page Ascending', async () => {
    let getasksbypage = await contract_marketplace.getAsksByPage(2, 2);
    let getasksbypagearr = [];
    let datagetasksbypage = [];
    for (let i = 0; i < getasksbypage.length; i++) {
      getasksbypagearr.push([getasksbypage[i][0], getasksbypage[i][1], getasksbypage[i][2], getasksbypage[i][3], getasksbypage[i][4]]);
    }
    for (var i = 3; i <= 4; i++) {
      datagetasksbypage.push([accounts[0], contract_nft.address, String(i), "10000", true]);
    }
    assert.deepEqual(getasksbypage, datagetasksbypage);
  });

  it('10. Set Current Price Batch', async () => {
    truffleAssert.eventEmitted(await contract_marketplace.setCurrentPriceBatch([1], 50), 'Ask');
    const getaskSCP = await contract_marketplace.getAskBatch([1]);
    assert.deepEqual([getaskSCP[0][0], getaskSCP[0][1], getaskSCP[0][2], getaskSCP[0][3], getaskSCP[0][4]],
      [accounts[0], contract_nft.address, "1", "50", true]);
  });

  it('11. Suspend NFT Batch, Check Suspend NFT Batch, and Unsuspend NFT Batch', async () => {
    truffleAssert.eventEmitted(await contract_marketplace.suspendNFTBatch([2, 3]), 'SuspendNFT');
    assert.deepEqual(await contract_marketplace.isSuspendNFTBatch([2, 3]), [true, true]);
    await contract_marketplace.unsuspendNFTBatch([2, 3]);
    assert.deepEqual(await contract_marketplace.isSuspendNFTBatch([2, 3]), [false, false]);
  });

  it('12. Cancel Sell NFT Batch', async () => {
    truffleAssert.eventEmitted(await contract_marketplace.cancelSellNFTBatch([9, 10]), 'CancelSellNFT');
    const getaskcancel = await contract_marketplace.getAskBatch([9]);
    assert.deepEqual(getaskcancel[0][0], '0x0000000000000000000000000000000000000000');
  });

  it('13. Buy NFT', async () => {
    await contract_token.transfer(accounts[1], "5000000000000000000000000");
    await contract_token.transfer(accounts[3], "5000000000000000000000000");
    // 1. First Selling Merchant
    const feeAddress = await contract_marketplace.showFeeAddress();
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 0);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[0])), 4.9e+26);
    await contract_token.increaseAllowance(contract_marketplace.address, "500000000000000000000000000", { from: accounts[1] });
    const BuyNFT = await contract_marketplace.buyNFT(2, { from: accounts[1] });
    truffleAssert.eventEmitted(BuyNFT, 'Trade');
    truffleAssert.eventEmitted(BuyNFT, 'LogBuy');
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 100000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[0])), 4.900009e+26);
    const getaskbuy1 = await contract_marketplace.getAskBatch([2]);
    assert.deepEqual(getaskbuy1[0][0], '0x0000000000000000000000000000000000000000');
    // 2. Not Merchant
    await contract_nft.safeMint(accounts[4], "0x10");
    await contract_nft.approve(contract_marketplace.address, 11, { from: accounts[4] });
    await contract_marketplace.sellNFTBatch(contract_nft.address, [11], 10000, { from: accounts[4] });
    await contract_marketplace.buyNFT(11, { from: accounts[1] });
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 130000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[4])), 970000000000000000000);
    const getaskbuy2 = await contract_marketplace.getAskBatch([11]);
    assert.deepEqual(getaskbuy2[0][0], '0x0000000000000000000000000000000000000000');
    // 3. Second Selling Merchant
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[0])), 4.900009e+26);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[5])), 0);
    await contract_nft.transferFrom(accounts[1], accounts[5], 2, { from: accounts[1] });
    await contract_nft.approve(contract_marketplace.address, 2, { from: accounts[5] });
    await contract_marketplace.sellNFTBatch(contract_nft.address, [2], 10000, { from: accounts[5] });
    await contract_marketplace.buyNFT(12, { from: accounts[1] });
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 145000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[0])), 4.90000915e+26);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[5])), 970000000000000000000);
    const getaskbuy3 = await contract_marketplace.getAskBatch([12]);
    assert.deepEqual(getaskbuy3[0][0], '0x0000000000000000000000000000000000000000');
  });

  it('14. Set Expired Times and Get Expired Times', async () => {
    const timeInMin = 5;
    const timeInSec = timeInMin * 60;
    truffleAssert.eventEmitted(await contract_marketplace.setExpiredTimes(timeInMin), 'SetExpiredTimes');
    const getPrice = await contract_marketplace.getThePrice(1);
    assert.strictEqual(Number(getPrice[3]), timeInSec);
  });

  it('15. Get Price TKO From Ask', async () => {
    let getPrice = await contract_marketplace.getThePrice(8);
    assert.deepEqual([Number(getPrice[0]), Number(getPrice[1]), Number(getPrice[2])], [1e+21, Number(getPrice[1]), Number(getPrice[2])]);
  });

  it('16. Buy NFT From Merchant', async () => {
    const feeAddress = await contract_marketplace.showFeeAddress();
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 145000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[0])), 4.90000915e+26);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[1])), 4.997e+24);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[3])), 5e+24);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[5])), 970000000000000000000);
    //1 Merchant sell NFT
    await contract_nft.safeMint(accounts[0], "0x11");
    await contract_marketplace.sellNFTBatch(contract_nft.address, [12], 10000);
    //2 Collector Buy NFT
    await contract_marketplace.buyNFT(13, { from: accounts[1] });
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 245000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[0])), 4.90001815e+26);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[1])), 4.996e+24);
    //3 Collector Sell NFT
    await contract_nft.approve(contract_marketplace.address, 12, { from: accounts[1] });
    await contract_marketplace.sellNFTBatch(contract_nft.address, [12], 10000, { from: accounts[1] });
    //4 Merchant lain Buy NFT
    await contract_token.transfer(accounts[5], "10000000000000000000000", { from: accounts[3] });
    await contract_marketplace.hasRole(MERCHANT_ROLE, accounts[5]);
    await contract_token.increaseAllowance(contract_marketplace.address, "500000000000000000000000000", { from: accounts[5] });
    await contract_marketplace.buyNFT(14, { from: accounts[5] });
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 260000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[0])), 4.9000183e+26);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[1])), 4.99697e+24);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[5])), 9.97e+21);
    //5 Merchant lain Sell NFT
    await contract_nft.approve(contract_marketplace.address, 12, { from: accounts[5] });
    await contract_marketplace.sellNFTBatch(contract_nft.address, [12], 10000, { from: accounts[5] });
    //6 Collector Buy NFT
    await contract_token.increaseAllowance(contract_marketplace.address, "500000000000000000000000000", { from: accounts[3] });
    await contract_marketplace.buyNFT(15, { from: accounts[3] });
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 275000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[0])), 4.90001845e+26);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[1])), 4.99697e+24);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[3])), 4.989e+24);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[5])), 1.094e+22);
  });

  it('17. Buy NFT From Collector', async () => {
    const feeAddress = await contract_marketplace.showFeeAddress();
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 275000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[0])), 4.90001845e+26);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[5])), 1.094e+22);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[6])), 0);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[7])), 0);
    //1 Collector sell NFT
    await contract_nft.safeMint(accounts[6], "0x12");
    await contract_nft.approve(contract_marketplace.address, 13, { from: accounts[6] });
    await contract_marketplace.sellNFTBatch(contract_nft.address, [13], 10000, { from: accounts[6] });
    //2 Merchant Buy NFT
    await contract_marketplace.buyNFT(16, { from: accounts[5] });
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 305000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[5])), 9.94e+21);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[6])), 970000000000000000000);
    //3 Merchant Sell NFT
    await contract_nft.approve(contract_marketplace.address, 13, { from: accounts[5] });
    await contract_marketplace.sellNFTBatch(contract_nft.address, [13], 10000, { from: accounts[5] });
    //4 Collector lain Buy NFT
    await contract_token.transfer(accounts[0], "10000000000000000000000", { from: accounts[3] });
    await contract_token.increaseAllowance(contract_marketplace.address, "500000000000000000000000000");
    await contract_marketplace.buyNFT(17);
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 335000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[0])), 4.90010845e+26);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[5])), 1.091e+22);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[6])), 970000000000000000000);
    //5 Merchant lain Sell NFT
    await contract_marketplace.sellNFTBatch(contract_nft.address, [13], 10000);
    //6 Collector Buy NFT
    await contract_token.transfer(accounts[7], "10000000000000000000000", { from: accounts[3] });
    await contract_token.increaseAllowance(contract_marketplace.address, "500000000000000000000000000", { from: accounts[7] });
    await contract_marketplace.buyNFT(18, { from: accounts[7] });
    assert.deepEqual(Number(await contract_token.balanceOf(feeAddress)), 365000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[0])), 4.90011815e+26);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[5])), 1.091e+22);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[6])), 970000000000000000000);
    assert.deepEqual(Number(await contract_token.balanceOf(accounts[7])), 9e+21);
  });

});