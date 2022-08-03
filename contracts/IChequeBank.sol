// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

interface IChequeBank {
  struct ChequeInfo {
    uint256 amount;
    bytes32 chequeId;
    uint32 validFrom;
    uint32 validThru;
    address payee;
    address payer;
  }

  struct SignOverInfo {
    uint8 counter;
    bytes32 chequeId;
    address oldPayee;
    address newPayee;
  }

  struct Cheque {
    ChequeInfo chequeInfo;
    bytes sig;
  }

  struct SignOver {
    SignOverInfo signOverInfo;
    bytes sig;
  }

  enum ChequeStage {
    CREATED,
    REDEEMED,
    REVOKED
  }

  struct ChequeStatus {
    ChequeStage stage;
    uint8 signOverCounter;
    address oldPayee;
    address newPayee;
  }

  function deposit() external payable;

  function withdraw(uint256 amount) external;

  function withdrawTo(uint256 amount, address payable recipient) external;

  function redeem(Cheque memory chequeData) external;

  function revoke(bytes32 chequeId) external;

  function notifySignOver(SignOver memory signOverData) external;

  function redeemSignOver(
    Cheque memory chequeData,
    SignOver[] memory signOverData
  ) external;

  event chequeRevoked(bytes32 indexed chequeId);

  event chequeRedeemed(
    bytes32 indexed chequeId,
    address indexed payer,
    address indexed payee,
    uint256 amount
  );

  event chequeSignedOver(
    bytes32 indexed chequeId,
    address indexed oldPayee,
    address indexed newPayee
  );
}
