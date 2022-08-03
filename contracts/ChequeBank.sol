// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
// import 'hardhat/console.sol';

import './IChequeBank.sol';

contract ChequeBank is IChequeBank {
  using ECDSA for bytes32;

  mapping(address => uint256) deposits;
  //this model holds because of the requirement:
  //signed over cheque cannot be revoked, revoked cheque cannot be signed over
  mapping(bytes32 => ChequeStatus) cheques;

  modifier requireAmount(uint256 amount) {
    require(amount > 0, 'Amount should be > 0');
    require(deposits[msg.sender] >= amount, 'Insufficient amount in deposit');

    _;
  }

  function deposit() external payable {
    require(msg.value > 0, 'Should include value for deposit');
    deposits[msg.sender] += msg.value;
  }

  function withdraw(uint256 amount) external {
    _withdrawTo(amount, payable(msg.sender));
  }

  function withdrawTo(uint256 amount, address payable recipient) external {
    _withdrawTo(amount, recipient);
  }

  function redeem(Cheque memory chequeData)
    external
    requireValidBaseCheque(chequeData)
    requireRedeemableCheque(chequeData.chequeInfo.chequeId)
    requireNotSignedOver(chequeData.chequeInfo.chequeId)
  {
    require(chequeData.chequeInfo.payee == msg.sender, 'Only correct payee');

    deposits[chequeData.chequeInfo.payer] -= chequeData.chequeInfo.amount;
    cheques[chequeData.chequeInfo.chequeId].stage = ChequeStage.REDEEMED;
    payable(chequeData.chequeInfo.payee).transfer(chequeData.chequeInfo.amount);

    emit chequeRedeemed(
      chequeData.chequeInfo.chequeId,
      chequeData.chequeInfo.payer,
      chequeData.chequeInfo.payee,
      chequeData.chequeInfo.amount
    );
  }

  function revoke(bytes32 chequeId)
    external
    requireNotSignedOverOrSignedOverPayee(chequeId)
  {
    cheques[chequeId].stage = ChequeStage.REVOKED;

    emit chequeRevoked(chequeId);
  }

  function notifySignOver(SignOver memory signOverData)
    external
    requireRedeemableCheque(signOverData.signOverInfo.chequeId)
  {
    require(
      msg.sender == signOverData.signOverInfo.newPayee,
      'Should be notified by new payee'
    );

    require(
      recoverSigner(signOverData) == signOverData.signOverInfo.oldPayee,
      'Invalid sign over, invalid signature'
    );

    require(
      signOverData.signOverInfo.counter >
        cheques[signOverData.signOverInfo.chequeId].signOverCounter,
      'Invalid sign over, newer sign over in store'
    );

    require(
      signOverData.signOverInfo.counter <= 6 &&
        signOverData.signOverInfo.counter >= 1,
      'Invalid sign over, invalid counter'
    );

    cheques[signOverData.signOverInfo.chequeId].signOverCounter = signOverData
      .signOverInfo
      .counter;

    cheques[signOverData.signOverInfo.chequeId].oldPayee = signOverData
      .signOverInfo
      .oldPayee;

    cheques[signOverData.signOverInfo.chequeId].newPayee = signOverData
      .signOverInfo
      .newPayee;

    emit chequeSignedOver(
      signOverData.signOverInfo.chequeId,
      signOverData.signOverInfo.oldPayee,
      signOverData.signOverInfo.newPayee
    );
  }

  function redeemSignOver(
    Cheque memory chequeData,
    SignOver[] memory signOverData
  )
    external
    requireValidBaseCheque(chequeData)
    requireRedeemableCheque(chequeData.chequeInfo.chequeId)
    requireValidSignOvers(chequeData.chequeInfo.payee, signOverData)
  {
    deposits[chequeData.chequeInfo.payer] -= chequeData.chequeInfo.amount;
    cheques[chequeData.chequeInfo.chequeId].stage = ChequeStage.REDEEMED;
    payable(msg.sender).transfer(chequeData.chequeInfo.amount);

    emit chequeRedeemed(
      chequeData.chequeInfo.chequeId,
      chequeData.chequeInfo.payer,
      msg.sender,
      chequeData.chequeInfo.amount
    );
  }

  function isChequeValid(
    address payee,
    Cheque memory chequeData,
    SignOver[] memory signOverData
  ) public view returns (bool) {
    if (recoverSigner(chequeData) != chequeData.chequeInfo.payer) {
      return false;
    }
    if (
      chequeData.chequeInfo.validFrom > 0 &&
      block.number < chequeData.chequeInfo.validFrom
    ) {
      return false;
    }
    if (
      chequeData.chequeInfo.validThru > 0 &&
      block.number > chequeData.chequeInfo.validThru
    ) {
      return false;
    }
    if (cheques[chequeData.chequeInfo.chequeId].stage != ChequeStage.CREATED) {
      return false;
    }
    if (signOverData.length == 0) {
      if (payee != chequeData.chequeInfo.payee) {
        return false;
      }
      if (cheques[chequeData.chequeInfo.chequeId].signOverCounter != 0) {
        return false;
      }
    } else {
      if (signOverData.length > 6) {
        return false;
      }
      if (
        signOverData[signOverData.length - 1].signOverInfo.newPayee != payee
      ) {
        return false;
      }
      address previousPayee = chequeData.chequeInfo.payee;
      for (uint256 i = 0; i < signOverData.length; i++) {
        if (signOverData[i].signOverInfo.counter != i + 1) {
          return false;
        }
        if (signOverData[i].signOverInfo.oldPayee != previousPayee) {
          return false;
        }
        if (
          recoverSigner(signOverData[i]) !=
          signOverData[i].signOverInfo.oldPayee
        ) {
          return false;
        }
        previousPayee = signOverData[i].signOverInfo.newPayee;
      }
    }
    return true;
  }

  function recoverSigner(Cheque memory cheque) public view returns (address) {
    return
      keccak256(
        abi.encodePacked(
          cheque.chequeInfo.chequeId,
          cheque.chequeInfo.payer,
          cheque.chequeInfo.payee,
          cheque.chequeInfo.amount,
          address(this),
          cheque.chequeInfo.validFrom,
          cheque.chequeInfo.validThru
        )
      ).toEthSignedMessageHash().recover(cheque.sig);
  }

  function recoverSigner(SignOver memory signOver)
    public
    pure
    returns (address)
  {
    bytes32 hash = keccak256(
      abi.encodePacked(
        bytes4(0xFFFFDEAD),
        signOver.signOverInfo.counter,
        signOver.signOverInfo.chequeId,
        signOver.signOverInfo.oldPayee,
        signOver.signOverInfo.newPayee
      )
    );
    bytes32 message = ECDSA.toEthSignedMessageHash(hash);
    return ECDSA.recover(message, signOver.sig);
  }

  function _withdrawTo(uint256 amount, address payable recipient)
    private
    requireAmount(amount)
  {
    deposits[msg.sender] -= amount;
    recipient.transfer(amount);
  }

  modifier requireValidBaseCheque(Cheque memory cheque) {
    require(
      recoverSigner(cheque) == cheque.chequeInfo.payer,
      'Invalid cheque, invalid signature'
    );
    if (cheque.chequeInfo.validFrom > 0) {
      require(
        block.number >= cheque.chequeInfo.validFrom,
        'Invalid cheque, not ready'
      );
    }
    if (cheque.chequeInfo.validThru > 0) {
      require(
        block.number <= cheque.chequeInfo.validThru,
        'Invalid cheque, expired'
      );
    }

    require(
      deposits[cheque.chequeInfo.payer] >= cheque.chequeInfo.amount,
      'Insufficient funds'
    );

    _;
  }

  modifier requireRedeemableCheque(bytes32 chequeId) {
    require(
      cheques[chequeId].stage == ChequeStage.CREATED,
      'Invalid cheque, not redeemable'
    );

    _;
  }

  modifier requireNotSignedOverOrSignedOverPayee(bytes32 chequeId) {
    if (cheques[chequeId].signOverCounter > 0) {
      require(
        cheques[chequeId].oldPayee == msg.sender,
        'Signed over cheque requires original payee to revoke'
      );
    } else {
      require(
        cheques[chequeId].signOverCounter == 0,
        'Cheque should not be signed over'
      );
    }

    _;
  }

  modifier requireNotSignedOver(bytes32 chequeId) {
    require(
      cheques[chequeId].signOverCounter == 0,
      'Cheque should not be signed over'
    );

    _;
  }

  modifier requireValidSignOvers(
    address previousPayee,
    SignOver[] memory signOverData
  ) {
    require(
      signOverData.length >= 1 && signOverData.length <= 6,
      'Invalid sign over data length'
    );

    require(
      msg.sender == signOverData[signOverData.length - 1].signOverInfo.newPayee,
      'Only latest payee'
    );

    for (uint256 i = 0; i < signOverData.length; i++) {
      require(
        signOverData[i].signOverInfo.counter == i + 1,
        'Invalid sign over, invalid counter sequence'
      );
      require(
        signOverData[i].signOverInfo.oldPayee == previousPayee,
        'Invalid sign over, invalid payee sequence'
      );

      require(
        recoverSigner(signOverData[i]) == signOverData[i].signOverInfo.oldPayee,
        'Invalid sign over, invalid signature'
      );

      previousPayee = signOverData[i].signOverInfo.newPayee;
    }

    _;
  }
}
