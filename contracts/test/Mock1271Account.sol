// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Test-only smart contract wallet (ERC-1271): a signature is valid when the owner signed the hash.
contract Mock1271Account {
    address public immutable owner;

    constructor(address owner_) {
        owner = owner_;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        if (signature.length != 65) return 0xffffffff;
        bytes32 r = bytes32(signature[0:32]);
        bytes32 s = bytes32(signature[32:64]);
        uint8 v = uint8(signature[64]);
        address recovered = ecrecover(hash, v, r, s);
        return recovered != address(0) && recovered == owner ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}
