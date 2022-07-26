export { stringPriceToNumber, requireTemperatureFromString }

const stringPriceToNumber = (stringPrice, decimal) => {
    if (typeof stringPrice !== 'string') {
        throw 'stringPrice is not a string'
    }

    if (isNaN(decimal) || decimal <= 0) {
        return stringPrice
    }

    if (stringPrice.length >= decimal + 1) {
        const splitIndex = stringPrice.length - decimal
        return (
            stringPrice.slice(0, splitIndex) +
            '.' +
            stringPrice.slice(splitIndex)
        )
    } else {
        return '0.' + stringPrice.padStart(decimal, '0')
    }
}

const requireTemperatureFromString = (temperatureString) => {
    const match = temperatureString.match(/\d/gi)
    const lastIndex = temperatureString.lastIndexOf(match[match.length - 1])
    const trimmedTemperatureString = temperatureString.substring(0, lastIndex + 1)
    const temperature = parseInt(trimmedTemperatureString)

    return temperature
}
