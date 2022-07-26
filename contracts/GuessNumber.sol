// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract GuessNumber {
    event GameHosted(uint deposit, bytes32 nonceHash, bytes32 nonceNumHash);
    event GuessSubmitted(uint16 guess, address player);
    event PlayersFull();
    event GameConcluded(bytes32 nonce, uint16 number);
    event AmountTransfered(uint amount, address receiver);

    
    //256
    uint public deposit;
    bytes32 public nonceHash;
    bytes32 public nonceNumHash;
    // 16 + 20 + 2
    uint16 public playersLimit; // [0,1000) -> max 1000 players
    address public host;
    Stage public stage = Stage.ACCEPTING_GUESS;

    address payable[] private playerAddresses;
    mapping(uint16 => address) private guessIndex;
    mapping(address => Guess) private playerGuesses; // cannot use mapping(address => uint16) since player can guess for 0

    struct Guess {
        bool isGuess;
        uint16 number;
    }
    
    enum Stage {
        ACCEPTING_GUESS,
        NUMBER_REVEALED
    }

    constructor(
        bytes32 _nonceHash,
        bytes32 _nonceNumHash,
        uint16 _playersLimit
    ) payable {
        require(msg.value > 0, "Host must put deposit");
        require(_playersLimit >= 2, "Player limit must be >= 2"); // 1 player should technically work but it wouldn't consider as "game", right?
        deposit = msg.value;

        host = msg.sender;

        playersLimit = _playersLimit;

        nonceHash = _nonceHash;
        nonceNumHash = _nonceNumHash;

        emit GameHosted(deposit, nonceHash, nonceNumHash);
    }

    modifier validateGuess(uint16 _guess) {
        require(stage == Stage.ACCEPTING_GUESS, "Game has concluded");
        require(playerAddresses.length < playersLimit, "Players full");
        require(msg.sender != host, "Host should not guess");
        require(msg.value == deposit, "Player should bet with same deposit");
        require(playerGuesses[msg.sender].isGuess == false, "Player has already guessed");
        require(_guess >= 0 && _guess < 1000, "Guess should be [0,1000)");
        require(guessIndex[_guess] != address(0), "Another player has guessed the number");

        _;
    }

    function guess(uint16 _guess) external payable validateGuess(_guess) {
        playerAddresses.push(payable(msg.sender));
        guessIndex[_guess] = msg.sender;
        playerGuesses[msg.sender] = Guess(true, _guess);

        emit GuessSubmitted(_guess, msg.sender);
        if (playerAddresses.length == playersLimit) {
            emit PlayersFull();
        }
    }

    modifier validateReveal(bytes32 nonce, uint16 number) {
        require(stage == Stage.ACCEPTING_GUESS, "Game has concluded");
        require(keccak256(abi.encode(nonce)) == nonceHash, "Nonce incorrect for nonceHash");
        require(
            keccak256(abi.encode(nonce, number)) == nonceNumHash,
            "Nonce and number pair incorrect for nonceNumHash"
        );
        require(playerAddresses.length >= 2, "At least 2 players before reveal"); 
        _;
    }

    modifier onlyHost() {
        require(msg.sender == host, "Host only");
        _;
    }

    function reveal(bytes32 nonce, uint16 number) external onlyHost() validateReveal(nonce, number) {
        uint playersNum = playerAddresses.length;
        if (number < 0 || number >= 1000) {
            uint amount = address(this).balance / playersNum;

            for (uint16 i = 0; i < playersNum; i++ ) {
                address payable playerAddress = playerAddresses[i];
                transferToPlayer(amount, playerAddress);
            }
        } else {
            uint16 smallestDelta = 1001;
            for (uint16 i = 0; i < playersNum; i++ ) {
                address payable playerAddress = playerAddresses[i];
                uint16 guessDelta = delta(playerGuesses[playerAddress].number,  number);
                if (guessDelta <= smallestDelta) {
                    smallestDelta = guessDelta;
                }
            }

            // explanation: there is alawys at least one winner and at most 2 winners with number guessed as number +/- smallestDelta 
            uint8 winnersNum = 0; 
            address payable upperWinner;
            address payable lowerWinner;
            if (number + smallestDelta < 1000 && guessIndex[number + smallestDelta] != address(0)) {
                upperWinner = payable(guessIndex[number + smallestDelta]);
                winnersNum += 1;
            } 
            if (number >= smallestDelta && guessIndex[number - smallestDelta] != address(0)) {
                lowerWinner = payable(guessIndex[number - smallestDelta]);
                winnersNum += 1;
            }

            assert(winnersNum >= 1);
            uint amount = address(this).balance / winnersNum;

            if (upperWinner != address(0)) {
                transferToPlayer(amount, upperWinner);
            }

            if (lowerWinner != address(0)) {
                transferToPlayer(amount, lowerWinner);
            }
        }

        stage = Stage.NUMBER_REVEALED;
        emit GameConcluded(nonce, number);
    }

    function transferToPlayer(uint amount, address payable toAddress) private {
        toAddress.transfer(amount);
        emit AmountTransfered(amount, toAddress);
    } 

    function delta(uint16 a, uint16 b) private pure returns (uint16) {
        return a >= b ? a - b : b - a;
    }   

}

