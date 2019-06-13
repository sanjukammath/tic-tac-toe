pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract TicTacToe {
    event Joined (uint id, address responder);
    event Played (uint id, address player);
    event Over (uint id, string result);
    
    enum Stages { Created, Joined, Over }
    
    struct Game{
        address payable X;
        address payable O;
        mapping(uint8 => mapping(uint8 => uint8)) board;
        address lastTurn;
        Stages stage;
        uint bounty;
        uint8 numberOfTurns;
        bool result;
    }
    
    mapping(address => uint) public tokenBalance;
    mapping(uint => Game) public games;
    
    address public tokenAddress;
    uint public numberOfGames;

    constructor (address a) public{
        tokenAddress = a;
        numberOfGames = 0;
    }
    
    function createGame (uint8 row, uint8 col) public payable {
        require(msg.value>.001 ether, "Add minimum stake value");
        require(row < 3 && col < 3, "index out of bound");
        
        Game memory newGame = Game({
           X: msg.sender,
           O: address(0),
           lastTurn: msg.sender,
           stage: Stages.Created,
           bounty: msg.value,
           numberOfTurns: 1,
           result: false
        });
        
        games[numberOfGames] = newGame;
        Game storage currentGame = games[numberOfGames];
        numberOfGames++;
        currentGame.board[row][col] = 1;

    }
    
    function join(uint g, uint8 row, uint8 col) public payable{
        require(g < numberOfGames, "Game not yet created");
        
        Game storage currentGame = games[g];
        
        require(msg.value >= currentGame.bounty, "Match the stake");
        require(msg.sender != currentGame.X, "Playing with self");
        require(currentGame.stage==Stages.Created, "Stage is not Created");
        require(currentGame.board[row][col] == 0);
        
        currentGame.O = msg.sender;
        currentGame.board[row][col] = 2;
        currentGame.bounty+= msg.value;
        currentGame.stage = Stages.Joined;
        currentGame.lastTurn = msg.sender;
        currentGame.numberOfTurns++;
        emit Joined(g, msg.sender);
    }
    
    function play(uint g, uint8 row, uint8 col) public{
        require(g < numberOfGames, "Game not yet created");
        
        Game storage currentGame = games[g];
        
        require(currentGame.stage==Stages.Joined, "Stage is not Joined");
        require(currentGame.board[row][col] == 0);
        
        if (currentGame.lastTurn == currentGame.X) {
            require(msg.sender == currentGame.O, "This is O's turn");
            currentGame.board[row][col] = 2;
        } else {
            require(msg.sender == currentGame.X, "This is X's turn");
            currentGame.board[row][col] = 1;
        }
        
        
        currentGame.lastTurn = msg.sender;
        currentGame.numberOfTurns++;
        
        if (currentGame.numberOfTurns > 4) {
            bool won = checkWinner(currentGame, row, col);
            if (won) {
                tokenBalance[msg.sender] += currentGame.bounty;
                currentGame.stage = Stages.Over;
                currentGame.result = true;
                emit Over(g, "Won");
            } else if (currentGame.numberOfTurns == 9) {
                uint drawRefund = currentGame.bounty/2;
                tokenBalance[currentGame.X] += drawRefund;
                tokenBalance[currentGame.O] += currentGame.bounty - drawRefund;
                currentGame.stage = Stages.Over;
                emit Over(g, "Draw");
            } else {
                emit Played(g, msg.sender);
            }
        }else {
            emit Played(g, msg.sender);
        }        
    }
    
    
    function checkWinner(Game storage currentGame, uint8 row, uint8 col) private view returns (bool won){
        
        uint8 c = currentGame.board[row][col];
        
        for(uint8 x = 0; x < 3; x++){
            if(currentGame.board[x][col] != c)
                break;
            if(x == 2){
                return true;
            }
        }
        
        for(uint8 y = 0; y < 3; y++){
            if(currentGame.board[row][y] != c)
                break;
            if(y == 2){
                return true;
            }
        }
        
        if (row != col){
            if (row + col != 2) {
                return false;
            }
            for(uint8 x = 0; x < 3; x++){
                if(currentGame.board[x][(2)-x] != c)
                    break;
                if(x == 2){
                    return true;
                }
            }
            
        } else {
            for(uint8 x = 0; x < 3; x++){
                if(currentGame.board[x][x] != c)
                    break;
                if(x == 2){
                    return true;
                }
            }
        }
        
        return false;
    }
    
    function claimTokens() public {
        uint senderRefund = tokenBalance[msg.sender];
        require(senderRefund > 0, "You don't have tokens");
        tokenBalance[msg.sender]=0;
        ERC20Mintable(tokenAddress).mint(msg.sender, senderRefund);
    }
    
    function claimRefund() public {
        uint tokens = ERC20Mintable(tokenAddress).allowance(msg.sender, address(this));
        require(tokens > 0, "You have to allow the contract to spend on your behalf");
        ERC20Mintable(tokenAddress).transferFrom(msg.sender, address(this), tokens);
        msg.sender.transfer(tokens);
    }
    
    function getBoard(uint g) public view returns (uint8[9] memory board) {
        Game storage currentGame = games[g];
        uint8 x = 0;

        for (uint8 i = 0; i < 3; i++){
            for (uint8 j = 0; j < 3; j++) {
                board[x] = currentGame.board[i][j];
                x++;
            }
        }
        return board;
    }
}