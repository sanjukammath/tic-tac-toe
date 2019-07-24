pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract ERC20Interface {
    function totalSupply() public view returns (uint256);
    function balanceOf(address _owner) public view returns (uint256 balance);
    function allowance(address _owner, address _spender) public view returns (uint256 remaining);
    function transfer(address _to, uint256 _value) public returns (bool success);
    function approve(address _spender, uint256 _value) public returns (bool success);
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract TGToken is ERC20Interface {
    using SafeMath for uint256;
    string public name = "TicTacToeGameToken";
    string public symbol = "TGT";
    uint8 public decimals = 0;
    address public contractOwner;

    mapping (address => uint256) private _balances;

    mapping (address => mapping (address => uint256)) private _allowances;

    uint256 private _totalSupply;
    
    constructor(uint initialSupply) public {
        contractOwner = msg.sender;
        _balances[msg.sender] = initialSupply;
        _totalSupply = initialSupply;
    }
    
    function requestTokens() public {
        require(_balances[msg.sender] < 5, "TGT: Requestor has enough tokens");
        require(_balances[contractOwner] > 5, "TGT: All tokens in supply have been distributed");
        
        _balances[contractOwner] = _balances[contractOwner].sub(5);
        _balances[msg.sender] = _balances[msg.sender].add(5);
        emit Transfer(contractOwner, msg.sender, 5);
    }
    
    function mint(uint amount) public {
        require (msg.sender == contractOwner, "TGT: Only token manager can mint");
        _balances[contractOwner] = _balances[contractOwner].add(amount);
        _totalSupply = _totalSupply.add(amount);
        emit Transfer(address(0), msg.sender, amount);
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount));
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    function _approve(address owner, address spender, uint256 value) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }
}