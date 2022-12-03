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

    Counters.Counter private _rewardRoundCounter;

    // userAddress => amountDeposited
    mapping(address => uint256) public depositedByAddress;

    // rewardRound => userAddress => amountDeposited
    mapping(uint => mapping(address => uint256)) public depositedByAddressPerRound;

    // rewardRound => totalDeposited
    mapping(uint => uint256) public totalDeposited;

    // rewardRound => totalRewards
    mapping(uint => uint256) public totalRewards;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _rewardRoundCounter.increment();
    }

    function deposit() public payable {
        require(msg.value > 0, "You need to send some Ether");

        uint256 currentRewardRound = _rewardRoundCounter.current();

        depositedByAddress[msg.sender] = depositedByAddress[msg.sender].add(msg.value);
        depositedByAddressPerRound[currentRewardRound][msg.sender] = depositedByAddressPerRound[currentRewardRound][msg.sender].add(msg.value);
        totalDeposited[currentRewardRound] = totalDeposited[currentRewardRound].add(msg.value);
        
        emit Deposit(msg.sender, msg.value);
    }

    function depositReward() public payable onlyRole(TEAM_MEMBER_ROLE) {
        require(msg.value > 0, "You need to send some Ether as reward");

        uint256 currentRewardRound = _rewardRoundCounter.current();

        totalRewards[currentRewardRound] = totalRewards[currentRewardRound].add(msg.value);
        
        emit DepositReward(msg.sender, msg.value);
    }

    function withdraw() public {
        uint256 currentRewardRound = _rewardRoundCounter.current();
        require(depositedByAddress[msg.sender] > 0, "You have no deposits");

        uint256 amountToWithdraw;

        for (uint i = currentRewardRound; i > 0; i--) {
            if (depositedByAddressPerRound[i][msg.sender] > 0) {
                if (totalRewards[i] > 0) {
                    // calculate reward
                    amountToWithdraw = amountToWithdraw.add(depositedByAddressPerRound[i][msg.sender].mul(totalRewards[i]).div(totalDeposited[i]));
                }
                // add deposits
                amountToWithdraw = amountToWithdraw.add(depositedByAddressPerRound[i][msg.sender]);
                depositedByAddressPerRound[i][msg.sender] = 0;
            }
        }
        depositedByAddress[msg.sender] = 0;
        payable(msg.sender).transfer(amountToWithdraw);

        emit Withdraw(msg.sender, amountToWithdraw);
    }

    function startNewRewardRound() public onlyRole(TEAM_MEMBER_ROLE) {
        _rewardRoundCounter.increment();
    }

    function getRewardRoundCounter() public view returns(uint256 rewardRoundCounter) {
        return _rewardRoundCounter.current();
    }

    event Deposit(address indexed user, uint256 amount);
    event DepositReward(address indexed teamMember, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
}
