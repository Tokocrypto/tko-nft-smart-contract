const DOMAIN_TYPE = [
  {
    type: "string",
    name: "name"
  },
    {
        type: "string",
        name: "version"
    },
  {
    type: "uint256",
    name: "chainId"
  },
  {
    type: "address",
    name: "verifyingContract"
  }
];

const TYPES = {
  set: [
    { name: 'uniqId', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'seller', type: 'address' },
    { name: 'contractNFT', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'contractToken', type: 'address' },
    { name: 'price', type: 'uint256' },
    { name: 'start', type: 'uint256' },
    { name: 'end', type: 'uint256' },
  ]
};
  
module.exports = {
  createTypeData: function (domainData, primaryType, message) {
    return {
      types: Object.assign({
        EIP712Domain: DOMAIN_TYPE,
      }, TYPES),
      domain: domainData,
      primaryType: primaryType,
      message: message
    };
  },

  signTypedData: function (web3, from, data) {
    return new Promise(async (resolve, reject) => {
      function cb(err, result) {
        if (err) {
          return reject(err);
        }
        if (result.error) {
          return reject(result.error);
        }

        const sig = result.result;
        const sig0 = sig.substring(2);
        const r = "0x" + sig0.substring(0, 64);
        const s = "0x" + sig0.substring(64, 128);
        const v = parseInt(sig0.substring(128, 130), 16);

        resolve({
          data,
          sig,
          v, r, s
        });
      }
      if (web3.currentProvider.isMetaMask) {
        web3.currentProvider.sendAsync({
          jsonrpc: "2.0",
          method: "eth_signTypedData_v4",
          params: [from, JSON.stringify(data)],
          id: new Date().getTime()
        }, cb);
      } else {
        let send = web3.currentProvider.sendAsync;
        if (!send) send = web3.currentProvider.send;
        send.bind(web3.currentProvider)({
          jsonrpc: "2.0",
          method: "eth_signTypedData",
          params: [from, data],
          id: new Date().getTime()
        }, cb);
      }
    });
  }
};