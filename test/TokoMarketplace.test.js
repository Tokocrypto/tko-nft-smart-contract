const { assert } = require("chai");
const truffleAssert = require('truffle-assertions');
const Web3 = require('web3');
const EIP712 = require("./helper/EIP712");

const TKOTokenExample = artifacts.require("TKOToken");
const TKONFTMerchant = artifacts.require("TKONFTMerchant");
const ManageToken = artifacts.require('ManageToken');
const TokoMarketplace = artifacts.require('TokoMarketplace');

contract('TokoMarketplace', function(accounts) {

  let tkotoken_instance;
  let contractnft_instance;
  let managetoken_instance;
  let tokomarketplace_instance;
  let web3;
  var nameDomain;
  var version;
  var chainId;
  let messageData0;
  let msgParams0;
  var timestampNow;

  before(async function() {
    tkotoken_instance = await TKOTokenExample.deployed();
    contractnft_instance = await TKONFTMerchant.deployed();
    managetoken_instance = await ManageToken.deployed();
    tokomarketplace_instance = await TokoMarketplace.deployed();
    truffleAssert.eventEmitted(await managetoken_instance.addToken(tkotoken_instance.address), 'AddToken');
    web3 = new Web3(tokomarketplace_instance.contract._provider.host);
    nameDomain = await tokomarketplace_instance.nameDomain.call();
    version = await tokomarketplace_instance.versionCode();
    chainId = Number(await web3.eth.getChainId());
    timestampNow = (await web3.eth.getBlock(await web3.eth.getBlockNumber())).timestamp;
  });

  it('1. Information Toko Marketplace', async () => {
    assert.deepEqual(nameDomain, "TokoMarketplace");
    assert.deepEqual(Number(version), 0);
  });

  it('2. Management Toko Marketplace', async () => {
    assert.deepEqual(await tokomarketplace_instance.feeAddress(), accounts[5]);
    assert.deepEqual(Number(await tokomarketplace_instance.platformFee()), 250);
    assert.deepEqual(await managetoken_instance.getSupportToken(tkotoken_instance.address), true);
  });

  it('3. Set Royalty Fee', async () => {
    truffleAssert.eventEmitted(await contractnft_instance.transferOwnership(accounts[3]), 'OwnershipTransferred');
    truffleAssert.eventEmitted(await tokomarketplace_instance.setRoyaltyFee(contractnft_instance.address, accounts[3], 1000, { from: accounts[3] }), 'RoyaltyFee');
    const royaltyFee = await tokomarketplace_instance.customRoyaltyFee(contractnft_instance.address);
    assert.deepEqual((royaltyFee.royaltyReceiver, Number(royaltyFee.royalty)), (accounts[3], 1000));
  });

  it('4. Cancel Match', async () => {
    messageData0 = {
      uniqId: "uniqObjectId",
      nonce: 123,
      seller: accounts[0],
      contractNFT: contractnft_instance.address,
      tokenId: 1,
      contractToken: tkotoken_instance.address,
      price: 100,
      start: timestampNow,
      end: (timestampNow + 1000)
    };
    msgParams0 = {
      domain: {
        name: nameDomain,
        version: version,
        chainId: chainId,
        verifyingContract: tokomarketplace_instance.address,
      },
      primaryType: 'set',
      message: messageData0
    };
    const data = EIP712.createTypeData(msgParams0.domain, msgParams0.primaryType, msgParams0.message);
    let result = await EIP712.signTypedData(web3, accounts[0], data);
    messageData0.buyer = "0x0000000000000000000000000000000000000000";
    // Cancel a non existance order
    await truffleAssert.fails(tokomarketplace_instance.cancelMatch(result.v, result.r, result.s, ""));
    // Cancel an order by non-seller
    await truffleAssert.reverts(tokomarketplace_instance.cancelMatch(result.v, result.r, result.s, messageData0, { from: accounts[1] }), "ERRSH4");
    // Success Cancel
    truffleAssert.eventEmitted(await tokomarketplace_instance.cancelMatch(result.v, result.r, result.s, messageData0), 'CancelMatch');
  });

  it('5. Execute Order Match', async () => {
    // Reuse uniqId
    const data0 = EIP712.createTypeData(msgParams0.domain, msgParams0.primaryType, msgParams0.message);
    let result0 = await EIP712.signTypedData(web3, accounts[0], data0);
    await truffleAssert.reverts(tokomarketplace_instance.executeOrderMatch(result0.v, result0.r, result0.s, messageData0), "ERRSH1"); // Error because reuse uniqId
    let messageData1 = {
      uniqId: "uniqObjectId123",
      nonce: 1234,
      seller: accounts[1],
      contractNFT: contractnft_instance.address,
      tokenId: 1,
      contractToken: tkotoken_instance.address,
      price: (10  ** 6),
      start: timestampNow,
      end: (timestampNow + 1000)
    };
    let msgParams1 = {
      domain: {
        name: nameDomain,
        version: version,
        chainId: chainId,
        verifyingContract: tokomarketplace_instance.address,
      },
      primaryType: 'set',
      message: messageData1
    };
    const data1 = EIP712.createTypeData(msgParams1.domain, msgParams1.primaryType, msgParams1.message);
    let result1 = await EIP712.signTypedData(web3, accounts[1], data1);
    messageData1.buyer = "0x0000000000000000000000000000000000000000";
    await contractnft_instance.safeMint(accounts[1], "0x0", { from: accounts[3] });
    assert.deepEqual(await contractnft_instance.ownerOf(1), accounts[1]);
    await contractnft_instance.setApprovalForAll(tokomarketplace_instance.address, true, { from: accounts[1] });
    await tkotoken_instance.mint("500000000000000000000000000");
    await tkotoken_instance.increaseAllowance(tokomarketplace_instance.address, "500000000000000000000000000", { from: accounts[2] });
    // Condition buyer if balance token is zero
    assert.deepEqual(Number(await tkotoken_instance.balanceOf(accounts[2])), 0);
    await truffleAssert.fails(tokomarketplace_instance.executeOrderMatch(result1.v, result1.r, result1.s, messageData1, { from: accounts[2] }));
    // Condition success order
    await tkotoken_instance.transfer(accounts[2], "1000000000");
    assert.deepEqual(Number(await tkotoken_instance.balanceOf(accounts[2])), 1000000000);
    truffleAssert.eventEmitted(await tokomarketplace_instance.executeOrderMatch(result1.v, result1.r, result1.s, messageData1, { from: accounts[2] }), 'OrderMatch');
    assert.deepEqual(Number(await tkotoken_instance.balanceOf(accounts[2])), 999000000); // Buyer
    assert.deepEqual(Number(await tkotoken_instance.balanceOf(accounts[1])), 875000); // Seller
    assert.deepEqual(Number(await tkotoken_instance.balanceOf(accounts[3])), 100000); // Royalty
    assert.deepEqual(Number(await tkotoken_instance.balanceOf(accounts[5])), 25000); // Platform
    assert.deepEqual(await contractnft_instance.ownerOf(1), accounts[2]); // Buyer received NFT
    let messageData2 = {
      uniqId: "uniqObjectId1234",
      nonce: 12345,
      seller: accounts[1],
      contractNFT: contractnft_instance.address,
      tokenId: 2,
      contractToken: "0x0000000000000000000000000000000000000000",
      price: "1000000000000000000000000000000",
      start: timestampNow,
      end: (timestampNow + 1000)
    };
    let msgParams2 = {
      domain: {
        name: nameDomain,
        version: version,
        chainId: chainId,
        verifyingContract: tokomarketplace_instance.address,
      },
      primaryType: 'set',
      message: messageData2
    };
    const data2 = EIP712.createTypeData(msgParams2.domain, msgParams2.primaryType, msgParams2.message);
    let result2 = await EIP712.signTypedData(web3, accounts[1], data2);
    messageData2.buyer = "0x0000000000000000000000000000000000000000";
    await contractnft_instance.safeMint(accounts[1], "0x1", { from: accounts[3] });
    assert.deepEqual(await contractnft_instance.ownerOf(2), accounts[1]);
    // Insufficient BNB value
    await truffleAssert.reverts(tokomarketplace_instance.executeOrderMatch(result2.v, result2.r, result2.s, messageData2, { from: accounts[2] }), "ERREOM6");
    // Buy when ERC721 has been transferred away from seller wallet
    messageData2.price = "1000000000000000000";
    await contractnft_instance.safeTransferFrom(accounts[1], accounts[4], 2, { from: accounts[1] });
    await truffleAssert.fails(tokomarketplace_instance.executeOrderMatch(result2.v, result2.r, result2.s, messageData2, { from: accounts[2] }));
  });

});