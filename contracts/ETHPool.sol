// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// people can deposit ETH
// they will receive weekly rewards
// Users must be able to take out their deposits along with their portion of rewards at any time
// New rewards are deposited manually into the pool by the ETHPool team each week using a contract function

contract ETHPool is AccessControl {
    bytes32 public constant TEAM_MEMBER_ROLE = keccak256("TEAM_MEMBER_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function deposit() public payable {
        require(msg.value > 0, "You need to send some Ether");
        emit Deposit(msg.sender, msg.value);
    }

    function depositReward() public payable onlyRole(TEAM_MEMBER_ROLE) {
        require(msg.value > 0, "You need to send some Ether as reward");
        emit DepositReward(msg.sender, msg.value);
    }

    event Deposit(address indexed user, uint256 amount);
    event DepositReward(address indexed teamMember, uint256 amount);
}
