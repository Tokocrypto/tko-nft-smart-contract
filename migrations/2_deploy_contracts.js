const TKOTokenExample = artifacts.require("TKOTokenExample");
const TKONFT = artifacts.require("TKONFT");
const TKONFTMerchant = artifacts.require("TKONFTMerchant");
const TKONFTMarketplace = artifacts.require("TKONFTMarketplace");
const PriceFeedTKOBIDR = artifacts.require("PriceFeedTKOBIDR");
const NftFactory = artifacts.require("NftFactory");

module.exports = async function (deployer, network, addresses) {
  if (network == 'mainnet') {
    return;
  } else {
    await deployer.deploy(TKOTokenExample);
    await deployer.deploy(PriceFeedTKOBIDR, 3, "TKOBIDR", 1000);
    const tokenTKO = await TKOTokenExample.deployed();
    const priceTKOBIDR = await PriceFeedTKOBIDR.deployed();
    await priceTKOBIDR.updatePrice(10000);
    await deployer.deploy(TKONFT);
    await deployer.deploy(TKONFTMerchant, "Tokocrypto NFT Merchant", "TKONFTMerchant");
    await deployer.deploy(TKONFTMarketplace, tokenTKO.address, addresses[0], priceTKOBIDR.address);
    await deployer.deploy(NftFactory);
  }
};

