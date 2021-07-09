const { assert } = require("chai");

const TKOTokenExample = artifacts.require('TKOTokenExample');
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
    assert.deepEqual(await contract_marketplace.hasRole(MERCHANT_ROLE, accounts[0]), true);
    assert.deepEqual(await contract_marketplace.hasRole(OPS_ROLE, accounts[0]), true);
    assert.deepEqual(await contract_marketplace.hasRole(DEFAULT_ADMIN_ROLE, accounts[0]), true);
  });

  it('2. Add Ops Role', async () => {
    await contract_marketplace.addOpsRole(accounts[1]);
    assert.deepEqual(await contract_marketplace.hasRole(OPS_ROLE, accounts[1]), true);
  });

  it('3. Remove Ops Role', async () => {
    await contract_marketplace.removeOpsRole(accounts[1]);
    assert.deepEqual(await contract_marketplace.hasRole(OPS_ROLE, accounts[1]), false);
  });

  it('4. Add Merchant Role', async () => {
    await contract_marketplace.addMerchantRole(accounts[1]);
    assert.deepEqual(await contract_marketplace.hasRole(MERCHANT_ROLE, accounts[1]), true);
  });

  it('5. Remove Merchant Role', async () => {
    await contract_marketplace.addOpsRole(accounts[2]);
    await contract_marketplace.removeMerchantRole(accounts[1], { from: accounts[2] });
    assert.deepEqual(await contract_marketplace.hasRole(MERCHANT_ROLE, accounts[1]), false);
  });

  it('6. Pause and Unpause', async () => {
    await contract_marketplace.pause();
    assert.deepEqual(await contract_marketplace.paused(), true);
    await contract_marketplace.unpause();
    assert.deepEqual(await contract_marketplace.paused(), false);
  });

  it('7. Set Fee and Show Fee', async () => {
    await contract_marketplace.setFee(1000, 150, 150, 300);
    const showfeearr = await contract_marketplace.showFee();
    assert.deepEqual({ 0: showfeearr[0].words[0], 1: showfeearr[1].words[0], 2: showfeearr[2].words[0], 3: showfeearr[3].words[0] }, {
      0: 1000,
      1: 150,
      2: 150,
      3: 300
    })
  });

  it('8. Set Fee Address and Show Fee Address', async () => {
    await contract_marketplace.setFeeAddress(accounts[2]);
    assert.deepEqual(await contract_marketplace.showFeeAddress(), accounts[2])
  });

  it('9. Suspend Collector, Check Suspend Collector, and Unsuspend Collector', async () => {
    await contract_marketplace.suspendCollector(accounts[2]);
    assert.deepEqual(await contract_marketplace.isSuspendCollector(accounts[2]), true);
    await contract_marketplace.unsuspendCollector(accounts[2]);
    assert.deepEqual(await contract_marketplace.isSuspendCollector(accounts[2]), false);
  });

  it('10. Add Contract NFT, Check Contract NFT, and Remove Contract NFT', async () => {
    await contract_marketplace.addContractNFT(contract_nft.address);
    assert.deepEqual(await contract_marketplace.isContractNFT(contract_nft.address), true);
    await contract_marketplace.removeContractNFT(contract_nft.address);
    assert.deepEqual(await contract_marketplace.isContractNFT(contract_nft.address), false);
  });

  it('11. Sell NFT, Get Ask, and Get Ask Batch', async () => {
    await contract_marketplace.addContractNFT(contract_nft.address);
    await contract_marketplace.sellNFT(contract_nft.address, 1, 10000000000);
    const getaskarr = await contract_marketplace.getAsk(1);
    assert.deepEqual([getaskarr[0], getaskarr[1], getaskarr[2], getaskarr[3], getaskarr[4]], [
      accounts[0], contract_nft.address, '1', '10000000000', true ]);
    for (let i = 2; i < 11; i++) {
      await contract_marketplace.sellNFT(contract_nft.address, i, `${i}0000000000`);
    }
    let getaskbatch = await contract_marketplace.getAskBatch([1, 2, 3]);
    let getaskbatcharr = [];
    let datagetaskbatch = [];
    for (let i = 0; i < getaskbatch.length; i++) {
      getaskbatcharr.push([getaskbatch[i][0], getaskbatch[i][1], getaskbatch[i][2], getaskbatch[i][3], getaskbatch[i][4]]);
    }
    for (let i = 1; i <= getaskbatch.length; i++) {
      datagetaskbatch.push([ accounts[0], contract_nft.address, String(i), `${i}0000000000`, true ]);
    }
    assert.deepEqual(getaskbatcharr, datagetaskbatch);
  });

  it('12. Get Asks Ascending', async () => {
    let getasks = await contract_marketplace.getAsks();
    let getasksarr = [];
    let datagetasks = [];
    for (let i = 0; i < getasks.length; i++) {
      getasksarr.push([ getasks[i][0], getasks[i][1], getasks[i][2], getasks[i][3], getasks[i][4] ]);
    }
    for(var i = 1; i <= getasks.length; i++) {
      datagetasks.push([accounts[0], contract_nft.address, String(i), `${i}0000000000`, true]);
    }
    assert.deepEqual(getasks, datagetasks);
  });

  it('13. Get Asks Descending', async () => {
    let getasksdesc = await contract_marketplace.getAsksDesc();
    let getasksdescarr = [];
    let datagetasksdesc = [];
    for (let i = 0; i < getasksdesc.length; i++) {
      getasksdescarr.push([ getasksdesc[i][0], getasksdesc[i][1], getasksdesc[i][2], getasksdesc[i][3], getasksdesc[i][4] ]);
    }
    for(var i = getasksdesc.length; i > 0; i--) {
      datagetasksdesc.push([accounts[0], contract_nft.address, String(i), `${i}0000000000`, true]);
    }
    assert.deepEqual(getasksdesc, datagetasksdesc);
  });

  it('14. Get Asks By Page Ascending', async () => {
    let getasksbypage = await contract_marketplace.getAsksByPage(2, 2);
    let getasksbypagearr = [];
    let datagetasksbypage = [];
    for (let i = 0; i < getasksbypage.length; i++) {
      getasksbypagearr.push([ getasksbypage[i][0], getasksbypage[i][1], getasksbypage[i][2], getasksbypage[i][3], getasksbypage[i][4] ]);
    }
    for(var i = 3; i <= 4; i++) {
      datagetasksbypage.push([accounts[0], contract_nft.address, String(i), `${i}0000000000`, true]);
    }
    assert.deepEqual(getasksbypage, datagetasksbypage);
  });

  it('15. Get Asks By Page Descending', async () => {
    let getasksbypagedesc = await contract_marketplace.getAsksByPageDesc(2, 2);
    let getasksbypagedescarr = [];
    let datagetasksbypagedesc = [];
    for (let i = 0; i < getasksbypagedesc.length; i++) {
      getasksbypagedescarr.push([ getasksbypagedesc[i][0], getasksbypagedesc[i][1], getasksbypagedesc[i][2], getasksbypagedesc[i][3], getasksbypagedesc[i][4] ]);
    }
    for(var i = 8; i > 6; i--) {
      datagetasksbypagedesc.push([accounts[0], contract_nft.address, String(i), `${i}0000000000`, true]);
    }
    assert.deepEqual(getasksbypagedesc, datagetasksbypagedesc);
  });

  it('16. Set Current Price', async () => {
    await contract_marketplace.setCurrentPrice(1, 50);
    const getaskSCP = await contract_marketplace.getAsk(1); 
    assert.deepEqual([ getaskSCP[0], getaskSCP[1], getaskSCP[2], getaskSCP[3], getaskSCP[4] ],
      [ accounts[0], contract_nft.address, "1", "50", true ]);
  });

  it('17. Suspend NFT, Check Suspend NFT, and Unsuspend NFT', async () => {
    await contract_marketplace.suspendNFT(1);
    assert.deepEqual(await contract_marketplace.isSuspendNFT(1), true);
    await contract_marketplace.unsuspendNFT(1);
    assert.deepEqual(await contract_marketplace.isSuspendNFT(1), false);
  });

  it('18. Suspend NFT Batch, Check Suspend NFT Batch, and Unsuspend NFT Batch', async () => {
    await contract_marketplace.suspendNFTBatch([2, 3]);
    assert.deepEqual(await contract_marketplace.isSuspendNFTBatch([2, 3]), [true, true]);
    await contract_marketplace.unsuspendNFTBatch([2, 3]);
    assert.deepEqual(await contract_marketplace.isSuspendNFTBatch([2, 3]), [false, false]);
  });

  it('19. Cancel Sell NFT', async () => {
    await contract_marketplace.cancelSellNFT(1);
    const getaskcancel = await contract_marketplace.getAsk(1);
    assert.deepEqual(getaskcancel[0], '0x0000000000000000000000000000000000000000');
  });

  it('20. Buy NFT', async () => {
    await contract_token.transfer(accounts[1], 1000000000);
    // 1. First Selling Merchant
    const feeAddress = await contract_marketplace.showFeeAddress();
    assert.deepEqual((await contract_token.balanceOf(feeAddress)).words[0], 0);
    assert.deepEqual((await contract_token.balanceOf(accounts[0])).words[0], 6632960);
    await contract_token.approve(contract_marketplace.address, 100000000, { from: accounts[1] });
    await contract_marketplace.buyNFT(2, { from: accounts[1] });
    assert.deepEqual((await contract_token.balanceOf(feeAddress)).words[0], 200000);
    assert.deepEqual((await contract_token.balanceOf(accounts[0])).words[0], 8432960);
    const getaskbuy1 = await contract_marketplace.getAsk(2);
    assert.deepEqual(getaskbuy1[0], '0x0000000000000000000000000000000000000000');
    // 2. Not Merchant
    await contract_nft.safeMint(accounts[4], "0x10");
    await contract_nft.approve(contract_marketplace.address, 11, { from: accounts[4] });
    await contract_marketplace.sellNFT(contract_nft.address, 11, 10000000000, { from: accounts[4] });
    await contract_marketplace.buyNFT(11, { from: accounts[1] });
    assert.deepEqual((await contract_token.balanceOf(feeAddress)).words[0], 230000);
    assert.deepEqual((await contract_token.balanceOf(accounts[4])).words[0], 970000);
    const getaskbuy2 = await contract_marketplace.getAsk(11);
    assert.deepEqual(getaskbuy2[0], '0x0000000000000000000000000000000000000000');
    // 3. Second Selling Merchant
    assert.deepEqual((await contract_token.balanceOf(accounts[0])).words[0], 8432960);
    assert.deepEqual((await contract_token.balanceOf(accounts[5])).words[0], 0);
    await contract_nft.transferFrom(accounts[1], accounts[5], 2, { from: accounts[1] });
    await contract_nft.approve(contract_marketplace.address, 2, { from: accounts[5] });
    await contract_marketplace.sellNFT(contract_nft.address, 2, 10000000000, { from: accounts[5] });
    await contract_marketplace.buyNFT(12, { from: accounts[1] });
    assert.deepEqual((await contract_token.balanceOf(feeAddress)).words[0], 245000);
    assert.deepEqual((await contract_token.balanceOf(accounts[0])).words[0], 8447960);
    assert.deepEqual((await contract_token.balanceOf(accounts[5])).words[0], 970000);
    const getaskbuy3 = await contract_marketplace.getAsk(12);
    assert.deepEqual(getaskbuy3[0], '0x0000000000000000000000000000000000000000');
  });

  it('21. Set Expired Times and Get Expired Times', async () => {
    await contract_marketplace.setExpiredTimes(5);
    assert.deepEqual((await contract_marketplace.expiredTimes()).words[0], 300);
  });

  it('22. Get Price TKO From Ask', async () => {
    assert.deepEqual((await contract_marketplace.getThePrice(8)).words[0], 8000000);
  });

});