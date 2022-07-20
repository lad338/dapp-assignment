import fs from 'fs'
import solc from 'solc'

const configureContract = (web3, abi, address) => {
    return new web3.eth.Contract(abi, address)
}

const deployContract = async (web3, account, abi, bytecode) => {
    console.log('------ Deploying contract ------')
    web3.eth.accounts.wallet.add(account)

    const contract = new web3.eth.Contract(abi, null, {
        data: '0x' + bytecode,
    })
    const estimatedGas = await contract.deploy().estimateGas()
    const gasPrice = await web3.eth.getGasPrice()
    console.log('estimatedGas: ' + estimatedGas)
    console.log('gasPrice: ' + gasPrice)

    const receipt = await contract.deploy().send({
        from: account.address,
        gasPrice: gasPrice,
        gas: estimatedGas,
    })
    console.log('Contract deployed at: ' + receipt._address)
}

const compileContract = (fileName, filePath) => {
    const file = fs.readFileSync(filePath).toString()

    const input = {
        language: 'Solidity',
        sources: {
            [fileName]: {
                content: file,
            },
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*'],
                },
            },
        },
    }

    return JSON.parse(solc.compile(JSON.stringify(input)))
}

export { configureContract, compileContract, deployContract }
