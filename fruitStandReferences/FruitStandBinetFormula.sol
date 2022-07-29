// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WATER is ERC20 {
    constructor(uint256 initialSupply) ERC20("WaterToken", "WATER") {
        _mint(msg.sender, initialSupply);
    }
}

contract MELON is ERC20 {
    constructor(uint256 initialSupply) ERC20("MelonToken", "MELON") {
        _mint(msg.sender, initialSupply);
    }
}

contract FruitStand {

    struct UserStake {
        uint startBlock;
        uint stakeAmount;
    }

    ERC20 water;
    ERC20 melon;
    mapping (address => UserStake) userStakes;


    constructor(address _water, address _melon) {
        water = ERC20(_water);
        melon = ERC20(_melon);
    }

    function stake(uint _amount) external {
        require(_amount > 0, "FruitStand: Stake amount must be greater than zero");
        if (userStakes[msg.sender].startBlock != 0) {
            // Pay out current stake
            payout(msg.sender, userStakes[msg.sender]);
        }
        water.transferFrom(msg.sender, address(this), _amount);
        UserStake memory newStake = UserStake({ startBlock: block.number, stakeAmount: _amount });
        userStakes[msg.sender] = newStake; 
    }

    function unstake() external {
        require(userStakes[msg.sender].startBlock != 0, "FruitStand: User have not staked");
        payout(msg.sender, userStakes[msg.sender]);
        water.transfer(msg.sender, userStakes[msg.sender].stakeAmount);
        userStakes[msg.sender] = UserStake({ startBlock: 0, stakeAmount: 0 }); 
    }

    //Changed stake to _stake to fix warning "This declaration has the same name as another declaration"
    function payout(address user, UserStake memory _stake) internal returns (uint8 errCode) {
        uint blockDelta = block.number - _stake.startBlock;
        if (blockDelta > 300) {
            blockDelta = 300;
        }
        uint multiplier = fib(blockDelta); 
        uint rewardAmount = multiplier * _stake.stakeAmount;
        melon.transfer(user, rewardAmount);
        return 0;
    }

    // binet's formula method from https://dev.to/jpantunes/12-ways-to-fibonacci-17b1
    function fib(uint n) public pure returns (uint a) {
        if (n == 0) {
            return 0;
        }
        else if (n <= 2) return 1;   

        uint h = n / 2; 
        uint mask = 1;

        // find highest set bit in n
        while(mask <= h) mask <<= 1;

        mask >>= 1;
        a = 1;
        uint b = 1;
        uint c;

        while(mask > 0) {
            c = a * a + b * b;          
            if (n & mask > 0) {
                b = b * (b + 2 * a);  
                a = c;                
            } else {
                a = a * (2 * b - a);  
                b = c;                
            }
            mask >>= 1;
        }
        return a;
    }

}