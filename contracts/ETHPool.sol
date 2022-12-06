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
    event Withdraw(address indexed user, uint256 amount);

    bytes32 public constant TEAM_MEMBER_ROLE = keccak256("TEAM_MEMBER_ROLE");

    Counters.Counter private _weekCounter;

    // weekNumber => userAddress => amountDeposited
    mapping(uint256 => mapping(address => uint256)) public depositedByAddress;

    // weekNumber => totalDeposited
    mapping(uint256 => uint256) public totalDeposited;

    // weekNumber => rewardsDeposited
    mapping(uint256 => uint256) public rewardsDeposited;

    // userAddress => weekNumber
    mapping(address => uint256[]) public weeksUserDeposited;

    // userAddress => amountToWithdraw
    mapping(address => uint256) public amountToWithdraw;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _weekCounter.increment();
    }

    function deposit() public payable {
        require(msg.value > 0, "You need to send some ETH");

        uint256 currentWeek = _weekCounter.current();
        uint256 lastWeekUserDeposited = getLastWeekUserDeposited();

        if (lastWeekUserDeposited != 0 && lastWeekUserDeposited != currentWeek) {
            // Calculate rewards for last week user deposited and add to amountToWithdraw
            uint256 rewards = calculateRewards(lastWeekUserDeposited);
            amountToWithdraw[msg.sender] = amountToWithdraw[msg.sender].add(rewards);
        }

        totalDeposited[currentWeek] = totalDeposited[currentWeek].add(msg.value);
        amountToWithdraw[msg.sender] = amountToWithdraw[msg.sender].add(msg.value);
        depositedByAddress[currentWeek][msg.sender] = depositedByAddress[currentWeek][msg.sender].add(msg.value);

        weeksUserDeposited[msg.sender].push(currentWeek);

        emit Deposit(msg.sender, currentWeek, msg.value);
    }

    function depositReward() public payable onlyRole(TEAM_MEMBER_ROLE) {
        require(msg.value > 0, "You need to send some ETH as reward");

        uint256 currentWeek = _weekCounter.current();

        rewardsDeposited[currentWeek] = rewardsDeposited[currentWeek].add(msg.value);

        _weekCounter.increment();

        emit DepositReward(msg.sender, currentWeek, msg.value);
    }

    function withdraw() public {
        require(amountToWithdraw[msg.sender] > 0, "You have nothing to withdraw");
        require(weeksUserDeposited[msg.sender].length > 0, "You can't withdraw yet. Make a deposit first");

        uint256 currentWeek = _weekCounter.current();
        uint256 lastWeekUserDeposited = getLastWeekUserDeposited();

        if (lastWeekUserDeposited != currentWeek) {
            // Calculate rewards for last week user deposited and add to amountToWithdraw
            uint256 rewards = calculateRewards(lastWeekUserDeposited);
            amountToWithdraw[msg.sender] = amountToWithdraw[msg.sender].add(rewards);
        }

        amountToWithdraw[msg.sender] = 0;

        emit Withdraw(msg.sender, amountToWithdraw[msg.sender]);

        payable(msg.sender).transfer(amountToWithdraw[msg.sender]);
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

    function getLastWeekUserDeposited() private view returns (uint256) {
        // If the user has never deposited, return 0
        if (weeksUserDeposited[msg.sender].length == 0) {
            return 0;
        }
        // Otherwise, return the last week the user deposited
        return weeksUserDeposited[msg.sender][weeksUserDeposited[msg.sender].length - 1];
    }
}
