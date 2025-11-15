// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SoulboundDegree {

    string public name = "SoulboundDegree";
    string public symbol = "SBT";

    address public owner;

    mapping(address => uint256) public balance;
    mapping(address => string) public metadata;

    event Minted(address indexed to, string data);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    function mint(address to, string memory data) external onlyOwner {
        require(balance[to] == 0, "already minted");

        balance[to] = 1;
        metadata[to] = data;

        emit Minted(to, data);
    }

    // SBT cannot be transferred
    function transferFrom(address, address, uint256) external pure {
        revert("Soulbound: non-transferable");
    }
}
