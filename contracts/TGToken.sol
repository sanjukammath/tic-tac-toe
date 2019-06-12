pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract TGToken is ERC20Mintable {
    string public name = "TicTacToeGameToken";
    string public symbol = "TGT";
    uint8 public decimals = 2;
}