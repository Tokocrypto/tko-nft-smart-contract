const { assert } = require('chai');
const BlindBoxSetFactory = artifacts.require('BlindBoxSetFactory');
const TKONFTBlindBoxSet = artifacts.require('TKONFTBlindBoxSet');

contract('BlindBoxSetFactory', (accounts) => {
  let instance;

  before(async () => {
    instance = await BlindBoxSetFactory.deployed();
  })

  it('1. Create New Blind Box Set And Get Blind Box Sets', async () => {
    await instance.createBlindBoxSet('Blind Box Set Example', 'BBSE', 2, 1);
    const getContractAddres = await instance.getBlindBoxSets();
    let contractInstance = await TKONFTBlindBoxSet.at(getContractAddres[0]);
    assert.deepEqual(await contractInstance.name(), 'Blind Box Set Example');
    assert.deepEqual(await contractInstance.symbol(), 'BBSE');
    let detail = await contractInstance.getDetail();
    assert.deepEqual([Number(detail[0]), Number(detail[1]), Number(detail[2]), Number(detail[3])],
    [2, 0, 0, Number(detail[3])]);
  })

  it('2. Get Blind Box Sets By User', async () => {
    assert.deepEqual((await instance.getBlindBoxSetsByUser(accounts[0])).length, 1);
  })
})