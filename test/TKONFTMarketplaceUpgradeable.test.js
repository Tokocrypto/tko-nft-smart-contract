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
      const version1 = await instance.versionCode();
      expect(version1).to.be.a.bignumber.equal(new BN(0));

      // Upgrade to V2
      const instanceV2 = await upgradeProxy(instance.address, TKONFTMarketplaceV2);

      // Verify that proxy address are still the same
      assert.strictEqual(instance.address, instanceV2.address);

      // Verify newly added storage
      const version2 = await instanceV2.versionCode();
      expect(version2).to.be.a.bignumber.equal(new BN(2));
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