import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { BigNumber } from '@ethersproject/bignumber'
import hre, { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const getAmount = (etherInString: string): BigNumber => {
  return ethers.utils.parseEther(etherInString)
}

const getChequeId = (idString: string): string => {
  return ethers.utils.formatBytes32String(idString)
}

const getChequeHash = (chequeInfo: IChequeInfo, contractAddress: string) => {
  return ethers.utils.solidityKeccak256(
    ['bytes32', 'address', 'address', 'uint256', 'address', 'uint32', 'uint32'],
    [
      chequeInfo.chequeId,
      chequeInfo.payer,
      chequeInfo.payee,
      chequeInfo.amount,
      contractAddress,
      chequeInfo.validFrom,
      chequeInfo.validThru,
    ]
  )
}

const getChequeSignature = async (
  chequeInfo: IChequeInfo,
  contractAddress: string,
  owner: SignerWithAddress
) => {
  const hash = ethers.utils.arrayify(getChequeHash(chequeInfo, contractAddress))

  return await owner.signMessage(hash)
}

const getSignOverHash = (signOverInfo: ISignOverInfo) => {
  return ethers.utils.solidityKeccak256(
    ['bytes4', 'uint8', 'bytes32', 'address', 'address'],
    [
      0xffffdead,
      signOverInfo.counter,
      signOverInfo.chequeId,
      signOverInfo.oldPayee,
      signOverInfo.newPayee,
    ]
  )
}

const getSignOverSignature = async (
  signOverInfo: ISignOverInfo,
  signer: SignerWithAddress
) => {
  return await signer.signMessage(
    ethers.utils.arrayify(getSignOverHash(signOverInfo))
  )
}

describe('Cheque Bank contract', () => {
  const chequeBankFixture = async () => {
    const chequeBank = await ethers.getContractFactory('ChequeBank')
    const [payer, payee1, payee2, payee3, payee4] = await ethers.getSigners()

    const deployedChequeBank = await chequeBank.deploy()
    await deployedChequeBank.deployed()

    return {
      chequeBank,
      deployedChequeBank,
      payer,
      payee1,
      payee2,
      payee3,
      payee4,
    }
  }

  describe('Deposit and withdrawal', () => {
    describe('deposit', () => {
      it('should deposit to the bank', async () => {
        const { deployedChequeBank, payer } = await loadFixture(
          chequeBankFixture
        )
        await expect(
          deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })
        ).to.changeEtherBalances(
          [deployedChequeBank, payer],
          [getAmount('1'), getAmount('-1')]
        )
      })
    })

    describe('withdraw', () => {
      it('should withdraw to msg sender', async () => {
        const { deployedChequeBank, payer } = await loadFixture(
          chequeBankFixture
        )

        await deployedChequeBank
          .connect(payer)
          .deposit({ value: getAmount('1') })

        await expect(
          deployedChequeBank.connect(payer).withdraw(getAmount('1'))
        ).to.changeEtherBalances(
          [deployedChequeBank, payer],
          [getAmount('-1'), getAmount('1')]
        )
      })

      it('should revert if there is insufficient deposit', async () => {
        const { deployedChequeBank, payer } = await loadFixture(
          chequeBankFixture
        )

        await deployedChequeBank
          .connect(payer)
          .deposit({ value: getAmount('0.5') })

        await expect(
          deployedChequeBank.connect(payer).withdraw(getAmount('1'))
        ).to.be.revertedWith('Insufficient amount in deposit')
      })
    })
    describe('withdrawTo', () => {
      it('should withdraw to a payee specified', async () => {
        const { deployedChequeBank, payer, payee1 } = await loadFixture(
          chequeBankFixture
        )

        await deployedChequeBank
          .connect(payer)
          .deposit({ value: getAmount('1') })

        await expect(
          deployedChequeBank
            .connect(payer)
            .withdrawTo(getAmount('1'), payee1.address)
        ).to.changeEtherBalances(
          [deployedChequeBank, payee1],
          [getAmount('-1'), getAmount('1')]
        )
      })

      it('should revert if there is insufficient deposit', async () => {
        const { deployedChequeBank, payer, payee1 } = await loadFixture(
          chequeBankFixture
        )

        await deployedChequeBank
          .connect(payer)
          .deposit({ value: getAmount('0.5') })

        await expect(
          deployedChequeBank
            .connect(payer)
            .withdrawTo(getAmount('1'), payee1.address)
        ).to.be.revertedWith('Insufficient amount in deposit')
      })
    })
  })

  describe('Redeem', () => {
    it('should be able to redeem cheque', async () => {
      const { deployedChequeBank, payer, payee1 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })

      expect(
        await deployedChequeBank
          .connect(payee1)
          .isChequeValid(payee1.address, cheque, [])
      ).to.eq(true)

      await expect(
        deployedChequeBank.connect(payee1).redeem(cheque)
      ).to.changeEtherBalances(
        [deployedChequeBank, payee1],
        [getAmount('-1'), getAmount('1')]
      )
    })

    it('should not be able to redeem cheque with invalid signature', async () => {
      const { deployedChequeBank, payer, payee1 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payee1
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })

      expect(
        await deployedChequeBank
          .connect(payee1)
          .isChequeValid(payee1.address, cheque, [])
      ).to.eq(false)

      await expect(
        deployedChequeBank.connect(payee1).redeem(cheque)
      ).to.revertedWith('Invalid cheque, invalid signature')
    })

    it('should be able to redeem cheque in valid period', async () => {
      const { deployedChequeBank, payer, payee1 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 1,
        validThru: 5,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await hre.network.provider.send('hardhat_mine', ['0x2'])
      await deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })

      expect(
        await deployedChequeBank
          .connect(payee1)
          .isChequeValid(payee1.address, cheque, [])
      ).to.eq(true)

      await expect(deployedChequeBank.connect(payee1).redeem(cheque))
        .to.emit(deployedChequeBank, 'chequeRedeemed')
        .withArgs(chequeId, payer.address, payee1.address, amount)
    })

    it('should not be able to redeem not ready cheque', async () => {
      const { deployedChequeBank, payer, payee1 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 100,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })

      expect(
        await deployedChequeBank
          .connect(payee1)
          .isChequeValid(payee1.address, cheque, [])
      ).to.eq(false)

      await expect(
        deployedChequeBank.connect(payee1).redeem(cheque)
      ).to.be.revertedWith('Invalid cheque, not ready')
    })

    it('should not be able to redeem expired cheque', async () => {
      const { deployedChequeBank, payer, payee1 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 1,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await hre.network.provider.send('hardhat_mine', ['0x10'])
      await deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })

      expect(
        await deployedChequeBank
          .connect(payee1)
          .isChequeValid(payee1.address, cheque, [])
      ).to.eq(false)

      await expect(
        deployedChequeBank.connect(payee1).redeem(cheque)
      ).to.be.revertedWith('Invalid cheque, expired')
    })

    it('should not be able to redeem if payer has no deposit', async () => {
      const { deployedChequeBank, payer, payee1 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank
        .connect(payee1)
        .deposit({ value: getAmount('10') })

      expect(
        await deployedChequeBank
          .connect(payee1)
          .isChequeValid(payee1.address, cheque, [])
      ).to.eq(true)

      await expect(
        deployedChequeBank.connect(payee1).redeem(cheque)
      ).to.be.revertedWith('Insufficient funds')
    })

    it('should not be able to redeem redeemed cheque', async () => {
      const { deployedChequeBank, payer, payee1 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('2') })

      await deployedChequeBank.connect(payee1).redeem(cheque)

      expect(
        await deployedChequeBank
          .connect(payee1)
          .isChequeValid(payee1.address, cheque, [])
      ).to.eq(false)

      await expect(
        deployedChequeBank.connect(payee1).redeem(cheque)
      ).to.revertedWith('Invalid cheque, not redeemable')
    })
  })

  describe('Revoke', () => {
    it('should revoke cheque and emit chequeRevoked(chequeId)', async () => {
      const { deployedChequeBank, payer } = await loadFixture(chequeBankFixture)
      const chequeId = getChequeId('1')

      await expect(deployedChequeBank.connect(payer).revoke(chequeId))
        .to.emit(deployedChequeBank, 'chequeRevoked')
        .withArgs(chequeId)
    })

    it('should revoke signed over cheque by old payee', async () => {
      const { deployedChequeBank, payer, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')

      const signOverInfo = {
        counter: 1,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      await deployedChequeBank.connect(payee2).notifySignOver(signOverData)

      await expect(deployedChequeBank.connect(payee1).revoke(chequeId))
        .to.emit(deployedChequeBank, 'chequeRevoked')
        .withArgs(chequeId)
    })

    it('should not be able to redeem revoked cheque', async () => {
      const { deployedChequeBank, payer, payee1 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('2') })

      await deployedChequeBank.connect(payer).revoke(chequeId)

      expect(
        await deployedChequeBank
          .connect(payee1)
          .isChequeValid(payee1.address, cheque, [])
      ).to.eq(false)

      await expect(
        deployedChequeBank.connect(payee1).redeem(cheque)
      ).to.revertedWith('Invalid cheque, not redeemable')
    })

    it('should not be able to revoke signed over cheque by original payer', async () => {
      const { deployedChequeBank, payer, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')

      const signOverInfo = {
        counter: 1,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      await deployedChequeBank.connect(payee2).notifySignOver(signOverData)

      await expect(
        deployedChequeBank.connect(payer).revoke(chequeId)
      ).to.revertedWith('Signed over cheque requires original payee to revoke')
    })
  })

  describe('notifySignOver', () => {
    it('Should emit chequeSignedOver(chequeId, oldPayee, newPayee)', async () => {
      const { deployedChequeBank, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')

      const signOverInfo = {
        counter: 1,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      await expect(
        deployedChequeBank.connect(payee2).notifySignOver(signOverData)
      )
        .to.emit(deployedChequeBank, 'chequeSignedOver')
        .withArgs(chequeId, payee1.address, payee2.address)
    })

    it('should be able to sign over on sign over', async () => {
      const { deployedChequeBank, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')

      const signOverInfo = {
        counter: 1,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      const signOverInfo2 = {
        counter: 2,
        chequeId,
        oldPayee: payee2.address,
        newPayee: payee1.address,
      }

      const signOverData2 = {
        signOverInfo: signOverInfo2,
        sig: await getSignOverSignature(signOverInfo2, payee2),
      }

      await deployedChequeBank.connect(payee2).notifySignOver(signOverData)

      await expect(
        deployedChequeBank.connect(payee1).notifySignOver(signOverData2)
      )
        .to.emit(deployedChequeBank, 'chequeSignedOver')
        .withArgs(chequeId, payee2.address, payee1.address)
    })

    it('should be able to sign over for counter >= 1 && <= 6', async () => {
      const { deployedChequeBank, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')

      const signOverInfo2 = {
        counter: 2,
        chequeId,
        oldPayee: payee2.address,
        newPayee: payee1.address,
      }

      const signOverData2 = {
        signOverInfo: signOverInfo2,
        sig: await getSignOverSignature(signOverInfo2, payee2),
      }

      await expect(
        deployedChequeBank.connect(payee1).notifySignOver(signOverData2)
      )
        .to.emit(deployedChequeBank, 'chequeSignedOver')
        .withArgs(chequeId, payee2.address, payee1.address)
    })

    it('should not be able to submit old sign over', async () => {
      const { deployedChequeBank, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')

      const signOverInfo = {
        counter: 1,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      const signOverInfo2 = {
        counter: 2,
        chequeId,
        oldPayee: payee2.address,
        newPayee: payee1.address,
      }

      const signOverData2 = {
        signOverInfo: signOverInfo2,
        sig: await getSignOverSignature(signOverInfo2, payee2),
      }

      await deployedChequeBank.connect(payee1).notifySignOver(signOverData2)

      await expect(
        deployedChequeBank.connect(payee2).notifySignOver(signOverData)
      ).to.revertedWith('Invalid sign over, newer sign over in store')
    })

    it('should not be able to redeem signed over cheque', async () => {
      const { deployedChequeBank, payer, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo,
        sig,
      }

      const signOverInfo = {
        counter: 1,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('2') })

      await deployedChequeBank.connect(payee2).notifySignOver(signOverData)

      expect(
        await deployedChequeBank
          .connect(payee1)
          .isChequeValid(payee1.address, cheque, [signOverData])
      ).to.eq(false)

      await expect(
        deployedChequeBank.connect(payee1).redeem(cheque)
      ).to.revertedWith('Cheque should not be signed over')
    })

    it('should only allow new payee to notify', async () => {
      const { deployedChequeBank, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')

      const signOverInfo = {
        counter: 1,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      await expect(
        deployedChequeBank.connect(payee1).notifySignOver(signOverData)
      ).to.rejectedWith('Should be notified by new payee')
    })

    it('should not be able to sign over revoked cheque', async () => {
      const { deployedChequeBank, payer, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')

      const signOverInfo = {
        counter: 1,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      await deployedChequeBank.connect(payer).revoke(chequeId)

      await expect(
        deployedChequeBank.connect(payee2).notifySignOver(signOverData)
      ).to.rejectedWith('Invalid cheque, not redeemable')
    })

    it('should not be able to sign over on sign over for more than 6 times', async () => {
      const { deployedChequeBank, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')

      const signOverInfo = {
        counter: 6,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      const signOverInfo2 = {
        counter: 7,
        chequeId,
        oldPayee: payee2.address,
        newPayee: payee1.address,
      }

      const signOverData2 = {
        signOverInfo: signOverInfo2,
        sig: await getSignOverSignature(signOverInfo2, payee2),
      }

      await deployedChequeBank.connect(payee2).notifySignOver(signOverData)

      await expect(
        deployedChequeBank.connect(payee1).notifySignOver(signOverData2)
      ).to.revertedWith('Invalid sign over, invalid counter')
    })
  })

  describe('redeemSignOver', () => {
    it('should be able to redeem signed over once cheque', async () => {
      const { deployedChequeBank, payer, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })

      const signOverInfo = {
        counter: 1,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      expect(
        await deployedChequeBank
          .connect(payee2)
          .isChequeValid(payee2.address, cheque, [signOverData])
      ).to.eq(true)

      await deployedChequeBank.connect(payee2).notifySignOver(signOverData)

      await expect(
        deployedChequeBank
          .connect(payee2)
          .redeemSignOver(cheque, [signOverData])
      )
        .to.emit(deployedChequeBank, 'chequeRedeemed')
        .withArgs(chequeId, payer.address, payee2.address, amount)
    })

    it('should be able to redeem signed over cheque without preemptive notify', async () => {
      const { deployedChequeBank, payer, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })

      const signOverInfo = {
        counter: 1,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      expect(
        await deployedChequeBank
          .connect(payee2)
          .isChequeValid(payee2.address, cheque, [signOverData])
      ).to.eq(true)

      await expect(
        deployedChequeBank
          .connect(payee2)
          .redeemSignOver(cheque, [signOverData])
      )
        .to.emit(deployedChequeBank, 'chequeRedeemed')
        .withArgs(chequeId, payer.address, payee2.address, amount)
    })

    it('should be able to redeem signed over 6 times cheque', async () => {
      const { deployedChequeBank, payer, payee1, payee2, payee3, payee4 } =
        await loadFixture(chequeBankFixture)
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })

      const payees = [payee1, payee2, payee3, payee4]

      const signOverDataList = []

      for (let i = 0; i < 6; i++) {
        const signOverInfo = {
          counter: i + 1,
          chequeId,
          oldPayee: payees[i % payees.length].address,
          newPayee: payees[(i + 1) % payees.length].address,
        }

        const signOverData = {
          signOverInfo,
          sig: await getSignOverSignature(
            signOverInfo,
            payees[i % payees.length]
          ),
        }

        signOverDataList.push(signOverData)
      }

      expect(
        await deployedChequeBank
          .connect(payee3)
          .isChequeValid(payee3.address, cheque, signOverDataList)
      ).to.eq(true)

      await expect(
        deployedChequeBank
          .connect(payee3)
          .redeemSignOver(cheque, signOverDataList)
      )
        .to.emit(deployedChequeBank, 'chequeRedeemed')
        .withArgs(chequeId, payer.address, payee3.address, amount)
    })

    it('should be not able to redeem signed over by incorrect payee', async () => {
      const { deployedChequeBank, payer, payee1, payee2, payee3, payee4 } =
        await loadFixture(chequeBankFixture)
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })

      const payees = [payee1, payee2, payee3, payee4]

      const signOverDataList = []

      for (let i = 0; i < 6; i++) {
        const signOverInfo = {
          counter: i + 1,
          chequeId,
          oldPayee: payees[i % payees.length].address,
          newPayee: payees[(i + 1) % payees.length].address,
        }

        const signOverData = {
          signOverInfo,
          sig: await getSignOverSignature(
            signOverInfo,
            payees[i % payees.length]
          ),
        }

        signOverDataList.push(signOverData)
      }

      expect(
        await deployedChequeBank
          .connect(payee3)
          .isChequeValid(payee2.address, cheque, signOverDataList)
      ).to.eq(false)

      await expect(
        deployedChequeBank
          .connect(payee2)
          .redeemSignOver(cheque, signOverDataList)
      ).to.revertedWith('Only latest payee')
    })

    it('should be not able to redeem signed over no sign over data', async () => {
      const { deployedChequeBank, payer, payee1, payee2 } = await loadFixture(
        chequeBankFixture
      )
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })

      const signOverInfo = {
        counter: 1,
        chequeId,
        oldPayee: payee1.address,
        newPayee: payee2.address,
      }

      const signOverData = {
        signOverInfo,
        sig: await getSignOverSignature(signOverInfo, payee1),
      }

      expect(
        await deployedChequeBank
          .connect(payee2)
          .isChequeValid(payee2.address, cheque, [signOverData])
      ).to.eq(true)

      await deployedChequeBank.connect(payee2).notifySignOver(signOverData)

      await expect(
        deployedChequeBank.connect(payee2).redeemSignOver(cheque, [])
      ).to.revertedWith('Invalid sign over data length')
    })

    it('should be not able to redeem signed over with 7 sign over data', async () => {
      const { deployedChequeBank, payer, payee1, payee2, payee3, payee4 } =
        await loadFixture(chequeBankFixture)
      const chequeId = getChequeId('1')
      const amount = getAmount('1')
      const chequeInfo = {
        amount,
        chequeId,
        validFrom: 0,
        validThru: 0,
        payee: payee1.address,
        payer: payer.address,
      }

      const sig = await getChequeSignature(
        chequeInfo,
        deployedChequeBank.address,
        payer
      )

      const cheque = {
        chequeInfo: chequeInfo,
        sig,
      }

      await deployedChequeBank.connect(payer).deposit({ value: getAmount('1') })

      const payees = [payee1, payee2, payee3, payee4]

      const signOverDataList = []

      for (let i = 0; i < 7; i++) {
        const signOverInfo = {
          counter: i + 1,
          chequeId,
          oldPayee: payees[i % payees.length].address,
          newPayee: payees[(i + 1) % payees.length].address,
        }

        const signOverData = {
          signOverInfo,
          sig: await getSignOverSignature(
            signOverInfo,
            payees[i % payees.length]
          ),
        }

        signOverDataList.push(signOverData)
      }

      expect(
        await deployedChequeBank
          .connect(payee4)
          .isChequeValid(payee4.address, cheque, signOverDataList)
      ).to.eq(false)

      await expect(
        deployedChequeBank
          .connect(payee4)
          .redeemSignOver(cheque, signOverDataList)
      ).to.revertedWith('Invalid sign over data length')
    })
  })
})

interface IChequeInfo {
  amount: BigNumber
  chequeId: string //in bytes32
  validFrom: number
  validThru: number
  payee: string
  payer: string
}

interface ISignOverInfo {
  counter: number
  chequeId: string //in bytes32
  oldPayee: string
  newPayee: string
}
