// import Web3 from 'web3'

// import { compileContract, deployContract } from './lib/web3-util.mjs'

// import Provider from './config/web3-provider.json' assert { type: 'json' }
// import TestingAccount from './config/testing-account.json' assert { type: 'json' }

// const providerUrl = Provider.testnetUrl
// const web3 = new Web3(providerUrl)
// const account = web3.eth.accounts.privateKeyToAccount(TestingAccount.privateKey)

// const fileName = 'Multicall2.sol'
// const filePath = './contracts/Multicall2.sol'

// const compiledContract = compileContract(fileName, filePath)
// const abi = compiledContract.contracts[fileName].Multicall2.abi
// console.log('Compiled ABI: ')
// console.log(JSON.stringify(abi))
// const bytecode =
//     compiledContract.contracts[fileName].Multicall2.evm.bytecode.object

// await deployContract(web3, account, abi, bytecode)

import Multicall2 from './deployed-contracts/cronos-test-multicall2.json' assert { type: 'json' }
console.log('Contract has already deployed at ' + Multicall2.address)
