const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers')
const { expect } = require('chai')
const { ethers } = require('hardhat')

const deposit = ethers.utils.parseEther('1')
const nonce = 'GuessNumber'
const nonceBytes = ethers.utils.formatBytes32String(nonce)
const number = 123
const nonceHash = ethers.utils.keccak256(nonceBytes)
const nonceNumHash = ethers.utils.keccak256(
  ethers.utils.defaultAbiCoder.encode(['bytes32', 'uint'], [nonceBytes, number])
)

describe('Guess Number contract', () => {
  const guessNumberFixture = async () => {
    const guessNumber = await ethers.getContractFactory('GuessNumber')
    const [host, player1, player2, player3, player4] = await ethers.getSigners()

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

  const guessNumberFixtureAfterGuesses = async () => {
    const guessNumber = await ethers.getContractFactory('GuessNumber')
    const [host, player1, player2] = await ethers.getSigners()

    const hardhatGuessNumber = await guessNumber.deploy(
      nonceHash,
      nonceNumHash,
      3,
      {
        value: deposit,
      }
    )

    await hardhatGuessNumber.deployed()

    await hardhatGuessNumber.connect(player1).guess(111, { value: deposit })

    await hardhatGuessNumber.connect(player2).guess(222, { value: deposit })

    // Fixtures can return anything you consider useful for your tests
    return {
      guessNumber,
      hardhatGuessNumber,
      host,
      player1,
      player2,
    }
  }

  const guessNumberFixtureAfterReveal = async () => {
    const guessNumber = await ethers.getContractFactory('GuessNumber')
    const [host, player1, player2, player3] = await ethers.getSigners()

    const hardhatGuessNumber = await guessNumber.deploy(
      nonceHash,
      nonceNumHash,
      3,
      {
        value: deposit,
      }
    )

    await hardhatGuessNumber.deployed()

    await hardhatGuessNumber.connect(player1).guess(111, { value: deposit })

    await hardhatGuessNumber.connect(player2).guess(222, { value: deposit })

    await hardhatGuessNumber.connect(host).reveal(nonceBytes, number)

    // Fixtures can return anything you consider useful for your tests
    return {
      guessNumber,
      hardhatGuessNumber,
      host,
      player1,
      player2,
      player3,
    }
  }

  describe('Deployment', () => {
    it('should emit game hosted', async () => {
      const guessNumber = await ethers.getContractFactory('GuessNumber')

      expect(
        await guessNumber.deploy(nonceHash, nonceNumHash, 3, {
          value: deposit,
        })
      )
        .to.emit(guessNumber, 'GameHosted')
        .withArgs(deposit, nonceHash, nonceNumHash)
    })

    it('should set the correct deposit', async () => {
      const { hardhatGuessNumber } = await loadFixture(guessNumberFixture)

      expect(await hardhatGuessNumber.deposit()).to.equal(deposit)
    })
    it('should set the correct host', async () => {
      const { hardhatGuessNumber, host } = await loadFixture(guessNumberFixture)

      expect(await hardhatGuessNumber.host()).to.equal(host.address)
    })
    it('should set the correct player limit', async () => {
      const { hardhatGuessNumber } = await loadFixture(guessNumberFixture)

      expect(await hardhatGuessNumber.playersLimit()).to.equal(3)
    })
    it('should set the correct nonceHash', async () => {
      const { hardhatGuessNumber } = await loadFixture(guessNumberFixture)

      expect(await hardhatGuessNumber.nonceHash()).to.equal(nonceHash)
    })
    it('should set the correct nonceNumHash', async () => {
      const { hardhatGuessNumber } = await loadFixture(guessNumberFixture)

      expect(await hardhatGuessNumber.nonceNumHash()).to.equal(nonceNumHash)
    })
    it('should be at accepting guess stage', async () => {
      const { hardhatGuessNumber } = await loadFixture(guessNumberFixture)
      expect(await hardhatGuessNumber.stage()).to.equal(0) //Stage.ACCEPTING_GUESS is 0
    })
  })

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

  describe('Successful guesses', () => {
    it('should emit guess submitted', async () => {
      const { hardhatGuessNumber, player1 } = await loadFixture(
        guessNumberFixture
      )

      await expect(
        hardhatGuessNumber.connect(player1).guess(321, { value: deposit })
      )
        .to.emit(hardhatGuessNumber, 'GuessSubmitted')
        .withArgs(321, player1.address)
    })

    it('should not be reverted with 0 as the guess', async () => {
      const { hardhatGuessNumber, player1 } = await loadFixture(
        guessNumberFixture
      )

      await expect(
        hardhatGuessNumber.connect(player1).guess(0, { value: deposit })
      ).not.to.be.reverted
    })

    it('should have the correct sum of balance after players have guessed', async () => {
      const { hardhatGuessNumber, player1, player2 } = await loadFixture(
        guessNumberFixture
      )

      await hardhatGuessNumber.connect(player1).guess(321, { value: deposit })

      await hardhatGuessNumber.connect(player2).guess(123, { value: deposit })

      expect(
        await ethers.provider.getBalance(hardhatGuessNumber.address)
      ).to.equal(ethers.utils.parseEther('3')) // host + player 1 + player 2
    })

    it('should emit players full after reaching players limit', async () => {
      const { hardhatGuessNumber, player1, player2, player3 } =
        await loadFixture(guessNumberFixture)
      await hardhatGuessNumber.connect(player1).guess(111, { value: deposit })

      await hardhatGuessNumber.connect(player2).guess(222, { value: deposit })

      await expect(
        hardhatGuessNumber.connect(player3).guess(333, { value: deposit })
      ).to.emit(hardhatGuessNumber, 'PlayersFull')
    })
  })

  describe('Unsuccessful guess', () => {
    it('should revert if sender is host', async () => {
      const { hardhatGuessNumber, host } = await loadFixture(guessNumberFixture)

      await expect(
        hardhatGuessNumber.connect(host).guess(1, { value: deposit })
      ).to.be.revertedWith('Host should not guess')
    })

    it('should revert if player is not paying deposite', async () => {
      const { hardhatGuessNumber, player1 } = await loadFixture(
        guessNumberFixture
      )

      await expect(
        hardhatGuessNumber.connect(player1).guess(1)
      ).to.be.revertedWith('Player should bet with same deposit')
    })

    it('should revert if player is not paying the same as host', async () => {
      const { hardhatGuessNumber, player1 } = await loadFixture(
        guessNumberFixture
      )

      await expect(
        hardhatGuessNumber
          .connect(player1)
          .guess(1, { value: ethers.utils.parseEther('0.5') })
      ).to.be.revertedWith('Player should bet with same deposit')
    })

    it('should revert if player is not guessing [0,1000)', async () => {
      const { hardhatGuessNumber, player1 } = await loadFixture(
        guessNumberFixture
      )

      await expect(
        hardhatGuessNumber.connect(player1).guess(1000, { value: deposit })
      ).to.be.revertedWith('Guess should be [0,1000)')
    })

    it('should revert if player has already guessed', async () => {
      const { hardhatGuessNumber, player1 } = await loadFixture(
        guessNumberFixture
      )
      await hardhatGuessNumber.connect(player1).guess(321, { value: deposit })

      await expect(
        hardhatGuessNumber.connect(player1).guess(321, { value: deposit })
      ).to.be.revertedWith('Player has already guessed')
    })

    it('should revert if players limit has been reached', async () => {
      const { hardhatGuessNumber, player1, player2, player3, player4 } =
        await loadFixture(guessNumberFixture)
      await hardhatGuessNumber.connect(player1).guess(111, { value: deposit })

      await hardhatGuessNumber.connect(player2).guess(222, { value: deposit })

      await hardhatGuessNumber.connect(player3).guess(333, { value: deposit })

      await expect(
        hardhatGuessNumber.connect(player4).guess(444, { value: deposit })
      ).to.be.revertedWith('Players full')
    })

    it('should revert if another player has already guessed the number', async () => {
      const { hardhatGuessNumber, player1, player2 } = await loadFixture(
        guessNumberFixture
      )
      await hardhatGuessNumber.connect(player1).guess(111, { value: deposit })

      await expect(
        hardhatGuessNumber.connect(player2).guess(111, { value: deposit })
      ).to.be.revertedWith('Another player has guessed the number')
    })
  })

  describe('Unsuccessful reveal (wrong host)', () => {
    it('should revert if not the host is revealing', async () => {
      const { hardhatGuessNumber, player1 } = await loadFixture(
        guessNumberFixtureAfterGuesses
      )

      await expect(
        hardhatGuessNumber.connect(player1).reveal(nonceBytes, number)
      ).to.be.revertedWith('Host only')
    })
  })

  describe('Unsuccessful reveal (nonce errors)', () => {
    it('should revert if nonce is incorrect for nonceHash', async () => {
      const { hardhatGuessNumber, host } = await loadFixture(
        guessNumberFixtureAfterGuesses
      )

      await expect(
        hardhatGuessNumber
          .connect(host)
          .reveal(ethers.utils.formatBytes32String('INCORRECT_NONCE'), number)
      ).to.be.revertedWith('Nonce incorrect for nonceHash')
    })

    it('should revert if nonce and number pair is incorrect for nonceNumHash (same nonce incorrect error message)', async () => {
      const { hardhatGuessNumber, host } = await loadFixture(
        guessNumberFixtureAfterGuesses
      )

      await expect(
        hardhatGuessNumber.connect(host).reveal(nonceBytes, 156)
      ).to.be.revertedWith('Nonce incorrect for nonceHash')
    })
  })

  describe('Successful reveal', () => {
    it('should emit game concluded', async () => {
      const { hardhatGuessNumber, host } = await loadFixture(
        guessNumberFixtureAfterGuesses
      )

      await expect(hardhatGuessNumber.connect(host).reveal(nonceBytes, number))
        .to.emit(hardhatGuessNumber, 'GameConcluded')
        .withArgs(nonceBytes, number)
    })

    it('should change stage to NUMBER_REVEALED', async () => {
      const { hardhatGuessNumber, host } = await loadFixture(
        guessNumberFixtureAfterGuesses
      )
      await hardhatGuessNumber.connect(host).reveal(nonceBytes, number)
      expect(await hardhatGuessNumber.stage()).to.equal(1) //Stage.NUMBER_REVEALED is 1
    })

    it('should pay the 1 winner if there is 1 winner only if smallest delta', async () => {
      const { hardhatGuessNumber, host, player1 } = await loadFixture(
        guessNumberFixtureAfterGuesses
      )
      await expect(
        hardhatGuessNumber.connect(host).reveal(nonceBytes, number)
      ).to.changeEtherBalances(
        [hardhatGuessNumber, player1],
        [ethers.utils.parseEther('-3'), ethers.utils.parseEther('3')]
      )
    })

    it('should pay the 1 winner if there is 1 winner who got the number correct', async () => {
      const { hardhatGuessNumber, host, player1, player2, player3 } =
        await loadFixture(guessNumberFixture)

      await hardhatGuessNumber.connect(player1).guess(123, { value: deposit })
      await hardhatGuessNumber.connect(player2).guess(222, { value: deposit })
      await hardhatGuessNumber.connect(player3).guess(333, { value: deposit })

      await expect(
        hardhatGuessNumber.connect(host).reveal(nonceBytes, number)
      ).to.changeEtherBalances(
        [hardhatGuessNumber, player1],
        [ethers.utils.parseEther('-4'), ethers.utils.parseEther('4')]
      )
    })

    it('should pay the 2 winners if there is 2 winner', async () => {
      const { hardhatGuessNumber, host, player1, player2, player3 } =
        await loadFixture(guessNumberFixture)

      await hardhatGuessNumber.connect(player1).guess(122, { value: deposit })
      await hardhatGuessNumber.connect(player2).guess(124, { value: deposit })
      await hardhatGuessNumber.connect(player3).guess(333, { value: deposit })

      await expect(
        hardhatGuessNumber.connect(host).reveal(nonceBytes, number)
      ).to.changeEtherBalances(
        [hardhatGuessNumber, player1, player2],
        [
          ethers.utils.parseEther('-4'),
          ethers.utils.parseEther('2'),
          ethers.utils.parseEther('2'),
        ]
      )
    })

    it('should pay every players if the host is not using a number in range', async () => {
      const guessNumber = await ethers.getContractFactory('GuessNumber')
      const [host, player1, player2, player3, player4] =
        await ethers.getSigners()

      const number = 1000
      const nonceNumHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'uint'],
          [nonceBytes, number]
        )
      )

      const hardhatGuessNumber = await guessNumber.deploy(
        nonceHash,
        nonceNumHash,
        5,
        {
          value: deposit,
        }
      )

      await hardhatGuessNumber.deployed()

      await hardhatGuessNumber.connect(player1).guess(999, { value: deposit })
      await hardhatGuessNumber.connect(player2).guess(0, { value: deposit })
      await hardhatGuessNumber.connect(player3).guess(250, { value: deposit })
      await hardhatGuessNumber.connect(player4).guess(750, { value: deposit })

      await expect(
        hardhatGuessNumber.connect(host).reveal(nonceBytes, number)
      ).to.changeEtherBalances(
        [hardhatGuessNumber, player1, player2, player3, player4],
        [
          ethers.utils.parseEther('-5'),
          ethers.utils.parseEther('1.25'),
          ethers.utils.parseEther('1.25'),
          ethers.utils.parseEther('1.25'),
          ethers.utils.parseEther('1.25'),
        ]
      )
    })
  })

  describe('Unsuccessful reveal', () => {
    it('should revert if there is less than 2 players', async () => {
      const { hardhatGuessNumber, host, player1 } = await loadFixture(
        guessNumberFixture
      )

      await hardhatGuessNumber.connect(player1).guess(123, { value: deposit })

      await expect(
        hardhatGuessNumber.connect(host).reveal(nonceBytes, number)
      ).to.be.revertedWith('At least 2 players before reveal')
    })
  })

  describe('Unsuccessful post game transactions', () => {
    it('should revert guess post game', async () => {
      const { hardhatGuessNumber, player3 } = await loadFixture(
        guessNumberFixtureAfterReveal
      )

      await expect(
        hardhatGuessNumber.connect(player3).guess(777)
      ).to.be.revertedWith('Game has concluded')
    })
    it('should revert reveal post game', async () => {
      const { hardhatGuessNumber, host } = await loadFixture(
        guessNumberFixtureAfterReveal
      )

      await expect(
        hardhatGuessNumber.connect(host).reveal(nonceBytes, number)
      ).to.be.revertedWith('Game has concluded')
    })
  })
})
