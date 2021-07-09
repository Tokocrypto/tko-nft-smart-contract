const { assert } = require('chai');
const NftFactory = artifacts.require('NftFactory');
const TKONFTMerchant = artifacts.require('TKONFTMerchant');

contract('NftFactory', (accounts) => {
  const [owner, merchant, secondMerchant] = accounts;
  let instance;

  before(async () => {
    instance = await NftFactory.deployed();
  })

  it('can create new nft contract', async () => {
    const initialResponse = await instance.getNfts();
    await instance.createNft('foo', 'Foo', { from: merchant });
    const finalResponse = await instance.getNfts();
    assert.equal(finalResponse.length - initialResponse.length, 1);
  })

  it('new nft contract has correct name, symbol and owner', async () => {
    const name = 'foo';
    const symbol = 'bar';

    await instance.createNft(name, symbol, { from: merchant });
    const finalResponse = await instance.getNfts();
    const newNftAddress = finalResponse[finalResponse.length - 1];
    const newNftInstance = await TKONFTMerchant.at(newNftAddress);

    assert.equal(await newNftInstance.name(), name);
    assert.equal(await newNftInstance.symbol(), symbol);
    assert.equal(await newNftInstance.owner(), merchant);
  })

  it('emit event after create new nft', async () => {
    const name = 'foo';
    const symbol = 'bar';
    const eventName = 'NftCreated';

    const response = await instance.createNft(name, symbol, { from: merchant });
    const finalResponse = await instance.getNfts();
    const newNftAddress = finalResponse[finalResponse.length - 1];
    const event = response.logs.find(log => log.event === eventName);

    assert.exists(event);
    assert.equal(event.args.owner, merchant);
    assert.equal(event.args.nftAddress, newNftAddress);
  })

  it('can get nft based on user address', async () => {
    const name = 'foo';
    const symbol = 'bar';
    const eventName = 'NftCreated';

    const response = await instance.createNft(name, symbol, { from: merchant });
    const userNfts = await instance.getNftsByUser(merchant);
    const event = response.logs.find(log => log.event === eventName);
    const newNftAddress = event.args.nftAddress;

    assert.include(userNfts, newNftAddress);
  })

  it('returns empty array if user does not have nft', async () => {
    const secondMerchantNfts = await instance.getNftsByUser(secondMerchant);

    assert.isArray(secondMerchantNfts);
    assert.lengthOf(secondMerchantNfts, 0);
  })
})