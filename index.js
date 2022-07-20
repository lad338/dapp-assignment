import { btcUsdPrice } from './lib/oracle.js'
import { weatherRecord, retrieveTemperatureFromApi } from './lib/weather-record.js'

// const price = await btcUsdPrice()
const weather = await weatherRecord()
