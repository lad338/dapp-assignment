import WeatherRecord from '../contracts/cronos-test-weather-record.json' assert { type: 'json' }
import Provider from '../config/web3-provider.json' assert { type: 'json' }
import WeatherUrl from '../config/weather-url.json' assert { type: 'json' }
import TestingAccount from '../config/testing-account.json' assert { type: 'json' }
import Web3 from 'web3'
import axios from 'axios'
import { requireTemperatureFromString } from '../lib/string-util.js'
import { configureContract } from './web3-util.js'

const providerUrl = Provider.testnetUrl
const web3 = new Web3(providerUrl)
const account = web3.eth.accounts.privateKeyToAccount(TestingAccount.privateKey)

const LOCATIONS = ['hongkong', 'shanghai', 'london']

const weatherRecord = async () => {
    const batchId = requireBatchId()
    console.log('Batch ID: ' + batchId)
    const recordTemperature = await recordTemperatures(batchId)
    const weathers = await getWeathers(batchId)
    weathers.forEach((weatherRecord) => {
        console.log(
            'Temperature from chain for ' +
                weatherRecord.location +
                ': ' +
                weatherRecord.temperature
        )
    })
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
    const requiredUrl = WeatherUrl[location]
    if (!requiredUrl) {
        throw 'weather URL not found for ' + location
    }

    const response = await axios.get(requiredUrl)
    const rawTemperature = response.data.temperature
    console.log('Temperature from API for ' + location + ': ' + rawTemperature)
    return requireTemperatureFromString(rawTemperature)
}

const requireBatchId = () => {
    return Math.round(Date.now() / 1000)
}

const dummyTemperatures = async () => {
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
