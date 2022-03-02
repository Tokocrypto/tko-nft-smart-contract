const chai = require('chai');
const Fee = artifacts.require('Fee');

const BN = web3.utils.BN;
const chaiBN = require('chai-bn')(BN);
chai.use(chaiBN);

const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

const { expect } = chai;

contract('Fee', (accounts) => {
  const [owner, operator, anotherAccount] = accounts;
  let instance;

  before(async () => {
    instance = await Fee.deployed();
    const OPS_ROLE = await instance.OPS_ROLE();
    await instance.grantRole(OPS_ROLE, operator);
  })

  describe('hasCustomFee', () => {
    it('return false if contract has no custom fee', async () => {
      const contractAddress = '0xd5e099c71b797516c10ed0f0d895f429c2781141';
      const response = await instance.hasCustomFee(contractAddress);

      expect(response).to.be.false;
    })

    it('return true if contract has custom fee', async () => {
      const feeMarketplace = 1500;
      const feeOwner = 100;
      const feeMerchant = 100;
      const contractAddress = '0xd5e099c71b797516c10ed0f0d895f429c2781142';

      await instance.setFeeFor(contractAddress, feeMarketplace, feeOwner, feeMerchant, { from: operator });
      const response = await instance.hasCustomFee(contractAddress);

      expect(response).to.be.true;
    })
  })

  describe('setDefaultFee', () => {
    it('cannot set default fee without OPS_ROLE', () => {
      const feeMarketplace = 1000;
      const feeOwner = 150;
      const feeMerchant = 150;
      const feeCollector = 300;

      const fn = instance.setDefaultFee(feeMarketplace, feeOwner, feeMerchant, feeCollector, { from: anotherAccount });

      expect(fn).to.eventually.be.rejected;
    })

    it('can set default fee with OPS_ROLE', async () => {
      const feeMarketplace = 1000;
      const feeOwner = 150;
      const feeMerchant = 150;
      const feeCollector = 300;

      const fn = instance.setDefaultFee(feeMarketplace, feeOwner, feeMerchant, feeCollector, { from: operator });

      expect(fn).to.eventually.be.fulfilled;
    })

    it('emit event after set default fee', async () => {
      const feeMarketplace = 1000;
      const feeOwner = 150;
      const feeMerchant = 150;
      const feeCollector = 300;

      const response = await instance.setDefaultFee(feeMarketplace, feeOwner, feeMerchant, feeCollector, { from: operator });
      const { event, args } = response.logs[0];

      expect(event).to.be.equal('SetDefaultFee');
      expect(args.feeMarketplace).to.be.a.bignumber.equal(new BN(feeMarketplace));
      expect(args.feeOwner).to.be.a.bignumber.equal(new BN(feeOwner));
      expect(args.feeMerchant).to.be.a.bignumber.equal(new BN(feeMerchant));
      expect(args.feeCollector).to.be.a.bignumber.equal(new BN(feeCollector));
    })

    it(`cannot set default fee higher than 10000`, async () => {
      [
        [100000, 0, 0, 0],
        [0, 100000, 0, 0],
        [0, 0, 100000, 0],
        [0, 0, 0, 100000],
      ].forEach(([feeMarketplace, feeOwner, feeMerchant, feeCollector]) => {
        const fn = instance.setDefaultFee(feeMarketplace, feeOwner, feeMerchant, feeCollector, { from: operator });

        expect(fn).to.eventually.be.rejected;
      })
    })
  })

  describe('setFeeFor', () => {
    it('cannot set fee without OPS_ROLE', () => {
      const feeMarketplace = 1500;
      const feeOwner = 100;
      const feeMerchant = 100;
      const contractAddress = '0xd5e099c71b797516c10ed0f0d895f429c2781142';

      const fn = instance.setFeeFor(contractAddress, feeMarketplace, feeOwner, feeMerchant, { from: anotherAccount });

      expect(fn).to.eventually.be.rejected;
    })

    it('can set fee with OPS_ROLE', async () => {
      const defaultFeeMarketplace = 1000;
      const defaultFeeOwner = 150;
      const defaultFeeMerchant = 150;
      const defaultFeeCollector = 300;
      const feeMarketplace = 1500;
      const feeOwner = 100;
      const feeMerchant = 100;
      const contractAddress = '0xd5e099c71b797516c10ed0f0d895f429c2781142';

      await instance.setDefaultFee(defaultFeeMarketplace, defaultFeeOwner, defaultFeeMerchant, defaultFeeCollector, { from: operator });
      const fn = instance.setFeeFor(contractAddress, feeMarketplace, feeOwner, feeMerchant, { from: operator });
      
      expect(fn).to.eventually.be.fulfilled;
    })

    it('emit event after set fee', async () => {
      const feeMarketplace = 1500;
      const feeOwner = 100;
      const feeMerchant = 100;
      const contractAddress = '0xd5e099c71b797516c10ed0f0d895f429c2781142';

      const response = await instance.setFeeFor(contractAddress, feeMarketplace, feeOwner, feeMerchant, { from: operator });
      const { event, args } = response.logs[0];

      expect(event).to.be.equal('SetCustomFee');
      expect(args.contractAddress).to.be.a.bignumber.equal(new BN(contractAddress));
      expect(args.feeMarketplace).to.be.a.bignumber.equal(new BN(feeMarketplace));
      expect(args.feeOwner).to.be.a.bignumber.equal(new BN(feeOwner));
      expect(args.feeMerchant).to.be.a.bignumber.equal(new BN(feeMerchant));
    })

    it(`cannot set fee higher than 10000`, () => {
      const contractAddress = '0xd5e099c71b797516c10ed0f0d895f429c2781142';
      [
        [100000, 0, 0],
        [0, 100000, 0],
        [0, 0, 100000],
      ].forEach(([feeMarketplace, feeOwner, feeMerchant]) => {
        const fn = instance.setFeeFor(contractAddress, feeMarketplace, feeOwner, feeMerchant, { from: operator });

        expect(fn).to.eventually.be.rejected;
      })
    })
  })

  describe('removeFeeFor', () => {
    it('cannot remove fee without OPS_ROLE', async () => {
      const feeMarketplace = 1500;
      const feeOwner = 100;
      const feeMerchant = 100;
      const contractAddress = '0xd5e099c71b797516c10ed0f0d895f429c2781142';

      await instance.setFeeFor(contractAddress, feeMarketplace, feeOwner, feeMerchant, { from: operator });
      const fn = instance.removeFeeFor(contractAddress, { from: anotherAccount });

      expect(fn).to.eventually.be.rejected;
    })

    it('can remove fee with OPS_ROLE', async () => {
      const feeMarketplace = 1500;
      const feeOwner = 100;
      const feeMerchant = 100;
      const contractAddress = '0xd5e099c71b797516c10ed0f0d895f429c2781142';

      await instance.setFeeFor(contractAddress, feeMarketplace, feeOwner, feeMerchant, { from: operator });
      const fn = instance.removeFeeFor(contractAddress, { from: operator });

      expect(fn).to.eventually.be.fulfilled;
    })

    it('emit event after remove fee', async () => {
      const feeMarketplace = 1500;
      const feeOwner = 100;
      const feeMerchant = 100;
      const contractAddress = '0xd5e099c71b797516c10ed0f0d895f429c2781142';

      await instance.setFeeFor(contractAddress, feeMarketplace, feeOwner, feeMerchant, { from: operator });
      const response = await instance.removeFeeFor(contractAddress, { from: operator });
      const { event, args } = response.logs[0];

      expect(event).to.be.equal('RemoveCustomFee');
      expect(args.contractAddress).to.be.a.bignumber.equal(new BN(contractAddress));
    })
  })

  describe('getDefaultFee', () => {
    it('return default fee', async () => {
      const feeMarketplace = 1000;
      const feeOwner = 150;
      const feeMerchant = 150;
      const feeCollector = 300;

      await instance.setDefaultFee(feeMarketplace, feeOwner, feeMerchant, feeCollector, { from: operator });
      const response = await instance.getDefaultFee();

      expect(response[0]).to.be.a.bignumber.equal(new BN(feeMarketplace));
      expect(response[1]).to.be.a.bignumber.equal(new BN(feeOwner));
      expect(response[2]).to.be.a.bignumber.equal(new BN(feeMerchant));
      expect(response[3]).to.be.a.bignumber.equal(new BN(feeCollector));
    })
  })

  describe('getFeeFor', () => {
    it('return default fee if no custom fee set', async () => {
      const defaultFeeMarketplace = 1000;
      const defaultFeeOwner = 150;
      const defaultFeeMerchant = 150;
      const defaultFeeCollector = 300;
      const contractAddress = '0xd5e099c71b797516c10ed0f0d895f429c2781143';

      await instance.setDefaultFee(defaultFeeMarketplace, defaultFeeOwner, defaultFeeMerchant, defaultFeeCollector, { from: operator });
      const response = await instance.getFeeFor(contractAddress);

      expect(response[0]).to.be.a.bignumber.equal(new BN(defaultFeeMarketplace));
      expect(response[1]).to.be.a.bignumber.equal(new BN(defaultFeeOwner));
      expect(response[2]).to.be.a.bignumber.equal(new BN(defaultFeeMerchant));
      expect(response[3]).to.be.a.bignumber.equal(new BN(defaultFeeCollector));
    })

    it('return custom fee if custom fee is set', async () => {
      const defaultFeeMarketplace = 1000;
      const defaultFeeOwner = 150;
      const defaultFeeMerchant = 150;
      const defaultFeeCollector = 300;
      const feeMarketplace = 1500;
      const feeOwner = 100;
      const feeMerchant = 100;
      const contractAddress = '0xd5e099c71b797516c10ed0f0d895f429c2781143';

      await instance.setDefaultFee(defaultFeeMarketplace, defaultFeeOwner, defaultFeeMerchant, defaultFeeCollector, { from: operator });
      await instance.setFeeFor(contractAddress, feeMarketplace, feeOwner, feeMerchant, { from: operator });
      const response = await instance.getFeeFor(contractAddress);

      expect(response[0]).to.be.a.bignumber.equal(new BN(feeMarketplace));
      expect(response[1]).to.be.a.bignumber.equal(new BN(feeOwner));
      expect(response[2]).to.be.a.bignumber.equal(new BN(feeMerchant));
      expect(response[3]).to.be.a.bignumber.equal(new BN(defaultFeeCollector));
    })
  })
})