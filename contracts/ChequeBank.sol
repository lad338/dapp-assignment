// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './IChequeBank.sol';

contract ChequeBank is IChequeBank{
    mapping(address => uint) deposits;

    modifier requireAmountForWithdraw(uint amount) {
        require(amount > 0, 'Amount should be > 0');
        require(deposits[msg.sender] >= amount, 'Should have enough amount in deposit');
        _;
    }

    function deposit() payable external {
        require(msg.value > 0, 'Should include value for deposit');
        deposits[msg.sender] += msg.value;
    }

    function withdraw(
        uint amount
    ) external requireAmountForWithdraw(amount) {
        deposits[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }

    function withdrawTo(
        uint amount, 
        address payable recipient
    ) external requireAmountForWithdraw(amount) {
        deposits[msg.sender] -= amount;
        recipient.transfer(amount);
    }

    function redeem(Cheque memory chequeData) external {

    }

    function revoke(bytes32 chequeId) external {

    }

    function notifySignOver(
        SignOver memory signOverData
    ) external {

    }

    function redeemSignOver(
        Cheque memory chequeData,
        SignOver[] memory signOverData
    ) external {

    }
    
    function isChequeValid(
        address payee,
        Cheque memory chequeData,
        SignOver[] memory signOverData
    ) view public returns (bool) {

    }

    function isBaseChequeValid(
        Cheque memory chequeData
    ) pure public returns (bool) {
        uint8 v = uint8(chequeData.sig[0]);

        bytes32 r = bytesToBytes32(chequeData.sig, 1, 33);

        bytes32 s = bytesToBytes32(chequeData.sig, 33, 65);

        bytes32 hashedCheque = keccak256(abi.encode(chequeData.chequeInfo));

        address signer = ecrecover(hashedCheque, v, r, s);

        return signer != address(0);
    }

    function bytesToBytes32(
        bytes memory b, 
        uint from, 
        uint to
    ) pure public returns (bytes32){
        bytes memory temp;
        for (uint i = from; i < to; i++) {
            temp[i - from] =  (b[i]);
        }
        return bytes32(temp);
    }
}