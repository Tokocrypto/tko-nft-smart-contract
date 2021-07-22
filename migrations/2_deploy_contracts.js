const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const TKOTokenExample = artifacts.require("TKOToken");
const TKONFT = artifacts.require("TKONFT");
const TKONFTMerchant = artifacts.require("TKONFTMerchant");
const TKONFTMarketplace = artifacts.require("TKONFTMarketplace");
const PriceFeedTKOBIDR = artifacts.require("PriceFeedTKOBIDR");
const NftFactory = artifacts.require("NftFactory");

module.exports = async function (deployer, network, addresses) {
  // Oracle contract for TKO_BIDR
  await deployer.deploy(PriceFeedTKOBIDR, 3, "TKOBIDR", 1);
  const priceTKOBIDR = await PriceFeedTKOBIDR.deployed();
  let tkoContractAddress;
  if (network === 'bsc') {
    // https://bscscan.com/token/0x9f589e3eabe42ebc94a44727b3f3531c0c877809
    tkoContractAddress = '0x9f589e3eabe42ebc94a44727b3f3531c0c877809'
  } else {
    // use mock token outside of bsc
    await priceTKOBIDR.updatePrice(10000);
    await deployer.deploy(TKOTokenExample);
    await deployer.deploy(TKONFTMerchant, "Tokocrypto NFT Merchant", "TKONFTMerchant");
    const tkoToken = await TKOTokenExample.deployed();
    tkoContractAddress = tkoToken.address;
  }
  // Main merketplace contract
  const marketPlaceInstance = await deployProxy(TKONFTMarketplace, [tkoContractAddress, addresses[0], priceTKOBIDR.address], { deployer, kind: 'uups' });
  const MERCHANT_ROLE = await marketPlaceInstance.MERCHANT_ROLE();
  const OPS_ROLE = await marketPlaceInstance.OPS_ROLE();
  await marketPlaceInstance.grantRole(OPS_ROLE, addresses[0]);
  await marketPlaceInstance.grantRole(MERCHANT_ROLE, addresses[0]);

  // Common NFT contract for users
  await deployer.deploy(TKONFT);
  // NFT Factory contract to create Merchant specific contract
  await deployer.deploy(NftFactory);
};
