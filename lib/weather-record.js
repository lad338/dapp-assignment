import Web3 from 'web3'
import Axios from 'axios'
import { Multicall } from 'ethereum-multicall'

import { requireTemperatureFromString } from '../lib/string-util.js'
import { configureContract } from './web3-util.js'

import WeatherRecord from '../deployed-contracts/cronos-test-weather-record.json' assert { type: 'json' }
import Multicall2 from '../deployed-contracts/cronos-test-multicall2.json' assert { type: 'json' }

import Provider from '../config/web3-provider.json' assert { type: 'json' }
import WeatherUrl from '../config/weather-url.json' assert { type: 'json' }
import TestingAccount from '../config/testing-account.json' assert { type: 'json' }

const providerUrl = Provider.testnetUrl
const web3 = new Web3(providerUrl)
const account = web3.eth.accounts.privateKeyToAccount(TestingAccount.privateKey)
const multicall = new Multicall({
    nodeUrl: Provider.testnetUrl,
    tryAggregate: true,
    multicallCustomContractAddress: Multicall2.address,
})

const LOCATIONS = ['hongkong', 'shanghai', 'london']
const LOCATIONS_HEX64 = LOCATIONS.map((location) => {
    return {
        location: location,
        hex64: web3.utils.utf8ToHex(location).padEnd(64 + 2, '0'),
    }
}).reduce((obj, value) => ({ ...obj, [value.location]: value.hex64 }), {})

const weatherRecord = async () => {
    const batchId = requireBatchId()
    console.log('Batch ID: ' + batchId)
    const recordTemperature = await recordTemperatures(batchId)
    const weathers = await multicallGetWeathers(batchId)

    // calling without dynamic batchId
    // const weathers = await multicallGetWeathers(1658309334)

    weathers.forEach((weatherRecord) => {
        console.log(
            'Temperature from contract for ' +
                weatherRecord.location +
                ': ' +
                weatherRecord.temperature
        )
    })

    // (unused) calling one by one
    // const weathers = await getWeathers(batchId)
    // weathers.forEach((weatherRecord) => {
    //     console.log(
    //         'Temperature from contract for ' +
    //             weatherRecord.location +
    //             ': ' +
    //             weatherRecord.temperature
    //     )
    // })
    return weathers
}

const recordTemperatures = async (batchId) => {
    const temperatures = await retrieveTemperaturesFromApi()

    web3.eth.accounts.wallet.add(account)
    const transactions = await Promise.all(
        LOCATIONS.map(async (location) => {
            const transaction = requireContract().methods.reportWeather(
                batchId,
                web3.utils.utf8ToHex(location),
                temperatures[location]
            )
            return {
                location: location,
                transaction: transaction,
                gas: await transaction.estimateGas({ from: account.address }),
            }
        })
    )

    const receipts = []
    for (const transaction of transactions) {
        console.log('Sending transaction for ' + transaction.location)
        const receipt = await transaction.transaction.send({
            from: account.address,
            gas: transaction.gas,
        })
        console.log(
            'Transaction hash for ' +
                transaction.location +
                ': ' +
                receipt.transactionHash
        )
        receipts.push(receipt)
    }

    return receipts
}

const getWeathers = async (batchId) => {
    const result = await Promise.all(
        LOCATIONS.map(async (location) => {
            const temperature = await requireContract()
                .methods.getWeather(batchId, web3.utils.utf8ToHex(location))
                .call()
            return {
                location: location,
                temperature: temperature,
            }
        })
    )
    return result
}

const multicallGetWeathers = async (batchId) => {
    const multicallContext = {
        reference: 'getWeather',
        contractAddress: WeatherRecord.address,
        abi: WeatherRecord.abi,
        calls: LOCATIONS.map((location) => {
            return {
                reference: location,
                methodName: 'getWeather',
                methodParameters: [batchId, LOCATIONS_HEX64[location]],
            }
        }),
    }
    const response = await multicall.call(multicallContext)
    const result = response.results.getWeather.callsReturnContext.map((it) => {
        return { location: it.reference, temperature: it.returnValues[0] }
    })
    return result
}

const retrieveTemperaturesFromApi = async () => {
    const temperatures = {}
    await Promise.all(
        LOCATIONS.map(async (location) => {
            const temperature = await retrieveTemperatureFromApi(location)
            temperatures[location] = temperature
        })
    )
    return temperatures
}

const retrieveTemperatureFromApi = async (location) => {
    try {
        const requiredUrl = WeatherUrl[location]
        if (!requiredUrl) {
            throw 'weather URL not found for ' + location
        }

        const response = await Axios.get(requiredUrl)
        const rawTemperature = response.data.temperature
        console.log(
            'Temperature from API for ' + location + ': ' + rawTemperature
        )
        return requireTemperatureFromString(rawTemperature)
    } catch (e) {
        const result = mockRetrieveTemperatureFromApi()
        console.log(
            'Error retrieving temperature from API for ' +
                location +
                ', now mocking as: ' +
                result
        )
        return result
    }
}

const mockRetrieveTemperatureFromApi = () => {
    return Math.floor(Math.random() * 15 + 20)
}

const requireBatchId = () => {
    return Math.round(Date.now() / 1000)
}

const mockTemperatures = async () => {
    return {
        hongkong: 30,
        shanghai: 25,
        london: 20,
    }
}

const requireContract = () => {
    return configureContract(web3, WeatherRecord.abi, WeatherRecord.address)
}

export {
    weatherRecord,
    retrieveTemperatureFromApi,
    recordTemperatures,
    getWeathers,
}
