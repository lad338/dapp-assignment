const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')
const { ethers } = require('hardhat')

const deposit = ethers.utils.parseEther('1')
const nonce = 'GuessNumber'
const number = 123
const nonceHash = ethers.utils.keccak256(
    ethers.utils.formatBytes32String(nonce)
)
const nonceNumHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'uint'],
        [ethers.utils.formatBytes32String(nonce), number]
    )
)

describe('Guess Number contract', () => {
    const guessNumberFixture = async () => {
        const guessNumber = await ethers.getContractFactory('GuessNumber')
        const [host, player1, player2, player3, player4] =
            await ethers.getSigners()

        const hardhatGuessNumber = await guessNumber.deploy(
            nonceHash,
            nonceNumHash,
            3,
            {
                value: deposit,
            }
        )

        await hardhatGuessNumber.deployed()

        // Fixtures can return anything you consider useful for your tests
        return {
            guessNumber,
            hardhatGuessNumber,
            host,
            player1,
            player2,
            player3,
            player4,
        }
    }

    describe('Unsuccessful deployment', () => {
        it('should not be deployed without host deposit', async () => {
            const guessNumber = await ethers.getContractFactory('GuessNumber')
            await expect(
                guessNumber.deploy(nonceHash, nonceNumHash, 2)
            ).to.be.revertedWith('Host must put deposit')
        })

        it('should not be deployed with player limit not >= 2', async () => {
            const guessNumber = await ethers.getContractFactory('GuessNumber')
            await expect(
                guessNumber.deploy(nonceHash, nonceNumHash, 1, {
                    value: deposit,
                })
            ).to.be.revertedWith('Player limit must be >= 2')
        })
    })

    describe('Deployment', () => {
        it('should set the correct host', async () => {
            const { hardhatGuessNumber, host } = await loadFixture(
                guessNumberFixture
            )

            expect(await hardhatGuessNumber.host()).to.equal(host.address)
        })
    })
})
