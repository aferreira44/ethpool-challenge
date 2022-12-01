// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// people can deposit ETH
// they will receive weekly rewards
// Users must be able to take out their deposits along with their portion of rewards at any time
// New rewards are deposited manually into the pool by the ETHPool team each week using a contract function

contract ETHPool is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant TEAM_MEMBER_ROLE = keccak256("TEAM_MEMBER_ROLE");

    constructor() {
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function deposit() public payable {
        require(msg.value > 0, "You need to send some Ether");
    }
}
