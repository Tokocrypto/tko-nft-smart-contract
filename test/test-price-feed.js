const { assert } = require("chai");

const PriceFeedTKOBIDR = artifacts.require('PriceFeedTKOBIDR');

contract('PriceFeedTKOBIDR', function(accounts) {

  let contract_instance;

  before(async function() {
    contract_instance = await PriceFeedTKOBIDR.deployed();
  });

  it('1. Update Decimals and Check Decimals', async () => {
    await contract_instance.updateDecimals(0);
    assert.deepEqual(Number(await contract_instance.decimals()), 0);
  });

  it('2. Update Description and Check Description', async () => {
    await contract_instance.updateDescription("tes");
    assert.deepEqual(await contract_instance.description(), "tes");
  });

  it('3. Update Version and Check Version', async () => {
    await contract_instance.updateVersion(1);
    assert.deepEqual(Number(await contract_instance.version()), 1);
  });

  it('4. Update Price, Get Latest Round Data, and Get Round Data', async () => {
    await contract_instance.updatePrice(10000);
    let lrd = await contract_instance.latestRoundData();
    assert.deepEqual([Number(lrd[0]), Number(lrd[1]), Number(lrd[2]), Number(lrd[3]), Number(lrd[4])],
        [2, 10000, Number(lrd[2]), Number(lrd[3]), 2]);
    let grd = await contract_instance.getRoundData(1);
    assert.deepEqual([Number(grd[0]), Number(grd[1]), Number(grd[2]), Number(grd[3]), Number(grd[4])],
        [1, 10000, Number(grd[2]), Number(grd[3]), 2]);
  });

});