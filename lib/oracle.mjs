import CronosOracle from '../deployed-contracts/cronos-oracle.json' assert { type: 'json' }
import Provider from '../config/web3-provider.json' assert { type: 'json' }
import { stringPriceToNumber } from './string-util.mjs'
import { configureContract } from './web3-util.mjs'
import Web3 from 'web3'

const providerUrl = Provider.mainnetUrl
const web3 = new Web3(providerUrl)

const btcUsdPrice = async () => {
    const contract = configureContract(
        web3,
        CronosOracle.abi,
        CronosOracle.address
    )

    const rawResult = await contract.methods.latestAnswer().call()
    const rawDecimal = await contract.methods.decimals().call()
    const decimal = parseInt(rawDecimal)
    const result = stringPriceToNumber(rawResult, decimal)

    console.log("BTC/USD price: " + result)
    return result
}

export { btcUsdPrice }
