const chai = require('chai');

// Enable and inject BN dependency
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));

const { assert, expect } = chai;
const truffleAssert = require('truffle-assertions');
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const TKOToken = artifacts.require("TKOToken");
const PriceFeedTKOBIDR = artifacts.require("PriceFeedTKOBIDR");
const TKONFTMarketplace = artifacts.require('TKONFTMarketplace');
const TKONFTMarketplaceV2 = artifacts.require("TKONFTMarketplaceV2");

contract('TKONFTMarketplace', (addresses) => {
  const [deployer] = addresses;

  let tkoTokenInstance;
  let priceFeedInstance;

  before(async () => {
    tkoTokenInstance = await TKOToken.deployed();
    priceFeedInstance = await PriceFeedTKOBIDR.deployed();
  });

  describe('Upgradeable', () => {
    it('should be upgradeable', async () => {
      // Deploy V1
      const instance = await deployProxy(TKONFTMarketplace, [tkoTokenInstance.address, deployer, priceFeedInstance.address], { kind: 'uups' })

      // Expect V1 does not have public version function
      assert.isNotFunction(instance.version);

      // Upgrade to V2
      const instanceV2 = await upgradeProxy(instance.address, TKONFTMarketplaceV2);

      // Verify that proxy address are still the same
      assert.strictEqual(instance.address, instanceV2.address);

      // Verify newly added storage
      assert.isFunction(instanceV2.version);
      const version = await instanceV2.version();
      expect(version).to.be.a.bignumber.equal(new BN(2));
    })

    it('set fee should still be the same as before after upgrade', async () => {
      const marketplaceFee = 1000;
      const ownerFee = 2000;
      const merchantFee = 3000;
      const collectorFee = 4000;

      // Deploy V1
      const instance = await deployProxy(TKONFTMarketplace, [tkoTokenInstance.address, deployer, priceFeedInstance.address], { kind: 'uups' })

      await instance.setFee(marketplaceFee, ownerFee, merchantFee, collectorFee);
      let response = await instance.showFee();

      // Verify that first set fee successfully
      assert.strictEqual(response[0].words[0], marketplaceFee);
      assert.strictEqual(response[1].words[0], ownerFee);
      assert.strictEqual(response[2].words[0], merchantFee);
      assert.strictEqual(response[3].words[0], collectorFee);

      // Upgrade to V2
      const instanceV2 = await upgradeProxy(instance.address, TKONFTMarketplaceV2);
      response = await instanceV2.showFee();

      // Verify that first set fee successfully
      assert.strictEqual(response[0].words[0], marketplaceFee);
      assert.strictEqual(response[1].words[0], ownerFee);
      assert.strictEqual(response[2].words[0], merchantFee);
      assert.strictEqual(response[3].words[0], collectorFee);
    })
  })

  describe('NOT upgradeable', () => {
    it('should not upgradeable by user who do not have DEFAULT_ADMIN_ROLE', async () => {
      // Deploy V1
      const instance = await deployProxy(TKONFTMarketplace, [tkoTokenInstance.address, deployer, priceFeedInstance.address], { kind: 'uups' })
      const DEFAULT_ADMIN_ROLE = await instance.DEFAULT_ADMIN_ROLE();

      await instance.renounceRole(DEFAULT_ADMIN_ROLE, deployer);

      // Try upgrade to V2
      await truffleAssert.fails(upgradeProxy(instance.address, TKONFTMarketplaceV2));
    })
  })
});