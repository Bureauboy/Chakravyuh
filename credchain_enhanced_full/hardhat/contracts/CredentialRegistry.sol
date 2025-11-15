// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CredentialRegistry {

    struct CredentialRef {
        address issuer;
        bytes32 vcHash;
        string cid;
        uint64 issuedAt;
        bool revoked;
    }

    mapping(address => CredentialRef[]) private creds;
    mapping(address => bool) public isIssuer;

    address public owner;

    event Issued(address indexed issuer, address indexed student, uint indexed idx, bytes32 vcHash);
    event Revoked(address indexed issuer, address indexed student, uint indexed idx);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyIssuer() {
        require(isIssuer[msg.sender], "issuer only");
        _;
    }

    constructor() {
        owner = msg.sender;
        isIssuer[msg.sender] = true;
    }

    function setIssuer(address issuer, bool enabled) external onlyOwner {
        isIssuer[issuer] = enabled;
    }

    function issue(address student, bytes32 vcHash, string calldata cid) external onlyIssuer {
        creds[student].push(CredentialRef({
            issuer: msg.sender,
            vcHash: vcHash,
            cid: cid,
            issuedAt: uint64(block.timestamp),
            revoked: false
        }));

        emit Issued(msg.sender, student, creds[student].length - 1, vcHash);
    }

    function revoke(address student, uint idx) external onlyIssuer {
        require(idx < creds[student].length, "index invalid");
        CredentialRef storage c = creds[student][idx];
        require(c.issuer == msg.sender, "not issuer");
        c.revoked = true;

        emit Revoked(msg.sender, student, idx);
    }

    function getCount(address student) external view returns (uint) {
        return creds[student].length;
    }

    function getCred(address student, uint idx)
        external
        view
        returns (address issuer, bytes32 vcHash, string memory cid, uint64 issuedAt, bool revoked)
    {
        CredentialRef storage c = creds[student][idx];
        return (c.issuer, c.vcHash, c.cid, c.issuedAt, c.revoked);
    }
}
