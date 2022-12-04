// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

using SafeMath for uint256;
using Counters for Counters.Counter;

// people can deposit ETH
// they will receive weekly rewards
// Users must be able to take out their deposits along with their portion of rewards at any time
// New rewards are deposited manually into the pool by the ETHPool team each week using a contract function

contract ETHPool is AccessControl {
    bytes32 public constant TEAM_MEMBER_ROLE = keccak256("TEAM_MEMBER_ROLE");

    Counters.Counter private _weekCounter;

    // weekNumber => userAddress => amountDeposited
    mapping(uint => mapping(address => uint256)) public depositedByAddress;

    // weekNumber => totalDeposited
    mapping(uint => uint256) public totalDeposited;

    // weekNumber => rewardsDeposited
    mapping(uint => uint256) public rewardsDeposited;

    // userAddress => amountToWithdraw
    mapping(address => uint256) public amountToWithdraw;

       // userAddress => weekNumber
    mapping(address => uint256[]) public weeksUserDeposited;

    // userAddress => weekNumber
    mapping(address => uint256[]) public weeksUserCanClaim;

    // userAddress => weekNumber
    mapping(address => uint256[]) public weeksUserClaimed;


    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _weekCounter.increment();
    }

    function deposit() public payable {
        require(msg.value > 0, "You need to send some Ether");

        uint256 lastWeekUserDeposited;
        uint256 currentWeek = _weekCounter.current();

        weeksUserDeposited[msg.sender].push(currentWeek);
        weeksUserCanClaim[msg.sender].push(currentWeek);

        if (weeksUserDeposited[msg.sender].length.sub(1) != 0) {
            lastWeekUserDeposited = weeksUserDeposited[msg.sender][weeksUserDeposited[msg.sender].length.sub(1)];
            if (lastWeekUserDeposited != currentWeek){
                // Calculate rewards for last week user deposited and add to amountToWithdraw
                console.log("lastWeekUserDeposited: ", lastWeekUserDeposited);
                uint256 rewards = calculateRewards(msg.sender, lastWeekUserDeposited);
                amountToWithdraw[msg.sender] = amountToWithdraw[msg.sender].add(rewards);    
            } 
        }

        depositedByAddress[currentWeek][msg.sender] = depositedByAddress[currentWeek][msg.sender].add(msg.value);
        amountToWithdraw[msg.sender] = amountToWithdraw[msg.sender].add(msg.value);
        totalDeposited[currentWeek] = totalDeposited[currentWeek].add(msg.value);

        console.log("weeksUserDeposited[msg.sender].length: ", weeksUserDeposited[msg.sender].length);
        
        emit Deposit(msg.sender, currentWeek, msg.value);
    }

    function depositReward() public payable onlyRole(TEAM_MEMBER_ROLE) {
        require(msg.value > 0, "You need to send some Ether as reward");

        uint256 currentWeek = _weekCounter.current();

        rewardsDeposited[currentWeek] = rewardsDeposited[currentWeek].add(msg.value);

        _weekCounter.increment();
        
        emit DepositReward(msg.sender, currentWeek, msg.value);
    }

    function withdraw() public {
        require(weeksUserDeposited[msg.sender].length > 0, "You can't withdraw yet. Make a deposit first");
        require(amountToWithdraw[msg.sender] > 0, "You have nothing to withdraw");
        require(weeksUserCanClaim[msg.sender].length > 0, "You have nothing to withdraw");

        // Iterate through weeksUserCanClaim and add rewards to amountToWithdraw
        for (uint256 i = 0; i < weeksUserCanClaim[msg.sender].length; i++) {
            uint256 week = weeksUserCanClaim[msg.sender][i];
            if (rewardsDeposited[week] > 0) {
                uint256 rewards = calculateRewards(msg.sender, week);
                amountToWithdraw[msg.sender] = amountToWithdraw[msg.sender].add(rewards);
            }
            weeksUserClaimed[msg.sender].push(week);
            weeksUserCanClaim[msg.sender].pop();
        }

        payable(msg.sender).transfer(amountToWithdraw[msg.sender]);

        emit Withdraw(msg.sender, amountToWithdraw[msg.sender]);
    }

    function calculateRewards(address _userAddress, uint256 week) private view returns (uint256 rewards) {
        require(rewardsDeposited[week] > 0, "Rewards not deposited for this week");
    
        return depositedByAddress[week][_userAddress].mul(rewardsDeposited[week]).div(totalDeposited[week]);
    }

    function getCurrentWeek() public view returns(uint256 rewardRoundCounter) {
        return _weekCounter.current();
    }

    event Deposit(address indexed user, uint256 week, uint256 amount);
    event DepositReward(address indexed teamMember, uint256 week, uint256 amount);
    event Withdraw(address indexed teamMember, uint256 amount);
}
