// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract Upload {
    struct Access {
        address user;
        bool access;
    }

    mapping(address => string[]) private value;
    mapping(address => mapping(address => bool)) private ownership;
    mapping(address => Access[]) private accessList;
    mapping(address => mapping(address => bool)) private previousData;

    event FileAdded(address indexed user, string url);
    event AccessGranted(address indexed owner, address indexed user);
    event AccessRevoked(address indexed owner, address indexed user);

    function add(address _user, string memory url) external {
        require(_user == msg.sender, "Can only add files to your own account");
        require(bytes(url).length > 0, "URL cannot be empty");
        value[_user].push(url);
        emit FileAdded(_user, url);
    }

    function allow(address user) external {
        require(user != address(0), "Cannot allow zero address");
        require(user != msg.sender, "Cannot allow yourself");

        ownership[msg.sender][user] = true;
        if (previousData[msg.sender][user]) {
            for (uint256 i = 0; i < accessList[msg.sender].length; i++) {
                if (accessList[msg.sender][i].user == user) {
                    accessList[msg.sender][i].access = true;
                }
            }
        } else {
            accessList[msg.sender].push(Access(user, true));
            previousData[msg.sender][user] = true;
        }
        emit AccessGranted(msg.sender, user);
    }

    function disallow(address user) external {
        require(user != address(0), "Invalid address");
        ownership[msg.sender][user] = false;
        for (uint256 i = 0; i < accessList[msg.sender].length; i++) {
            if (accessList[msg.sender][i].user == user) {
                accessList[msg.sender][i].access = false;
            }
        }
        emit AccessRevoked(msg.sender, user);
    }

    function display(address _user) external view returns (string[] memory) {
        require(_user == msg.sender || ownership[_user][msg.sender], "You don't have access");
        return value[_user];
    }

    function shareAccess() external view returns (Access[] memory) {
        return accessList[msg.sender];
    }
}