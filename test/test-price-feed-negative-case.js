const { assert } = require("chai");

const PriceFeedTKOBIDR = artifacts.require('PriceFeedTKOBIDR');

contract('PriceFeedTKOBIDR', function(accounts) {

  let contract_instance;

  console.log(accounts);

  before(async function() {
    contract_instance = await PriceFeedTKOBIDR.deployed();
  });

  it('1. Update Decimals and Check Decimals', async () => {
    await contract_instance.updateDecimals(0);
    assert.notDeepEqual((await contract_instance.decimals()).words[0], 1);
  });

  it('2. Update Description and Check Description', async () => {
    await contract_instance.updateDescription("tes");
    assert.notDeepEqual(await contract_instance.description(), "Tes");
  });

  it('3. Update Version and Check Version', async () => {
    await contract_instance.updateVersion(1);
    assert.notDeepEqual((await contract_instance.version()).words[0], 0);
  });

  it('4. Update Price, Get Latest Round Data, and Get Round Data', async () => {
    await contract_instance.updatePrice(10000);
    let lrd = await contract_instance.latestRoundData();
    assert.notDeepEqual([lrd[0].words[0], lrd[1].words[0], lrd[2].words[0], lrd[3].words[0], lrd[4].words[0]],
        [2, 10000, 100, 100, 2]);
    let grd = await contract_instance.getRoundData(1);
    assert.notDeepEqual([grd[0].words[0], grd[1].words[0], grd[2].words[0], grd[3].words[0], grd[4].words[0]],
        [1, 1000, 1000, 1000, 2]);
  });

});