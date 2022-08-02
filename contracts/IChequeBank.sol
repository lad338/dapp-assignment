// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

interface IChequeBank {

    struct ChequeInfo {
        uint amount;
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

    function deposit() payable external ;
    function withdraw(uint amount) external;
    function withdrawTo(uint amount, address payable recipient) external;
    function redeem(Cheque memory chequeData) external;
    function revoke(bytes32 chequeId) external;
    function notifySignOver(
        SignOver memory signOverData
    ) external;
    function redeemSignOver(
        Cheque memory chequeData,
        SignOver[] memory signOverData
    ) external;

}