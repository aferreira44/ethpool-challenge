// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ETHPool is AccessControl {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    event Deposit(address indexed user, uint256 week, uint256 amount);
    event DepositReward(address indexed teamMember, uint256 week, uint256 amount);
    event Withdraw(address indexed teamMember, uint256 amount);

    bytes32 public constant TEAM_MEMBER_ROLE = keccak256("TEAM_MEMBER_ROLE");

    Counters.Counter private _weekCounter;

    // weekNumber => userAddress => amountDeposited
    mapping(uint256 => mapping(address => uint256)) public depositedByAddress;

    // weekNumber => totalDeposited
    mapping(uint256 => uint256) public totalDeposited;

    // weekNumber => rewardsDeposited
    mapping(uint256 => uint256) public rewardsDeposited;

    // timestamp
    uint256 public lastTimeDepositReward;

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
        require(msg.value > 0, "You need to send some ETH");

        uint256 currentWeek = _weekCounter.current();

        depositedByAddress[currentWeek][msg.sender] = depositedByAddress[currentWeek][msg.sender].add(msg.value);
        amountToWithdraw[msg.sender] = amountToWithdraw[msg.sender].add(msg.value);
        totalDeposited[currentWeek] = totalDeposited[currentWeek].add(msg.value);

        weeksUserDeposited[msg.sender].push(currentWeek);
        weeksUserCanClaim[msg.sender].push(currentWeek);
        
        emit Deposit(msg.sender, currentWeek, msg.value);
    }

    function depositReward() public payable onlyRole(TEAM_MEMBER_ROLE) {
        require(msg.value > 0, "You need to send some ETH as reward");
        require(block.timestamp > lastTimeDepositReward.add(1 weeks), "Team members can only deposit rewards once a week");

        uint256 currentWeek = _weekCounter.current();

        rewardsDeposited[currentWeek] = rewardsDeposited[currentWeek].add(msg.value);

        lastTimeDepositReward = block.timestamp;
        _weekCounter.increment();

        emit DepositReward(msg.sender, currentWeek, msg.value);
    }

    function withdraw() public {
        require(amountToWithdraw[msg.sender] > 0, "You have nothing to withdraw");
        require(weeksUserCanClaim[msg.sender].length > 0, "You have nothing to withdraw");

        // Iterate through weeksUserCanClaim and add rewards to amountToWithdraw
        uint256 limit = 52; // 52 weeks in a year
        while (weeksUserCanClaim[msg.sender].length > 0 && limit > 0) {
            uint256 i = weeksUserCanClaim[msg.sender].length - 1;
            uint256 week = weeksUserCanClaim[msg.sender][i];
            if (rewardsDeposited[week] > 0) {
                uint256 rewards = calculateRewards(week);
                amountToWithdraw[msg.sender] = amountToWithdraw[msg.sender].add(rewards);
            }
            weeksUserClaimed[msg.sender].push(week);
            weeksUserCanClaim[msg.sender].pop();
            limit--;
        }

        uint256 amountToBeTransferred = amountToWithdraw[msg.sender];
        amountToWithdraw[msg.sender] = amountToWithdraw[msg.sender].sub(amountToBeTransferred);

        emit Withdraw(msg.sender, amountToBeTransferred);

        payable(msg.sender).transfer(amountToBeTransferred);
    }

    function calculateRewards(uint256 week) private view returns (uint256 rewards) {
        require(totalDeposited[week] > 0, "No one deposited for this week");
        require(rewardsDeposited[week] > 0, "Rewards not deposited for this week");
        require(depositedByAddress[week][msg.sender] > 0, "You didn't deposit for this week");
    
        return depositedByAddress[week][msg.sender].mul(rewardsDeposited[week]).div(totalDeposited[week]);
    }

    function getCurrentWeek() public view returns (uint256 rewardRoundCounter) {
        return _weekCounter.current();
    }
}
