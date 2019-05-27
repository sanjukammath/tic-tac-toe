pragma solidity ^0.5.0;

contract GameManager {
    address[] public deployedGames;
    
    function createGame(uint i, uint j) public payable{
        require(msg.value>100);
        TicTacToe newGame = (new TicTacToe).value(msg.value)(msg.sender, i, j);
        
        deployedGames.push(address(newGame));
    }
    
    function getDeployedGames() public view returns (address[] memory) {
        return deployedGames;
    }
}

contract TicTacToe {
    address payable public X;
    address payable public O;
    uint8[3][3] public board;
    address payable public lastTurn;
    address payable public winner;
    //1 initated, 2 active,3 completed
    uint8 public stage;
    uint public bounty;
    uint public numberOfTurns;
    mapping(address => uint) public refunds;
    
    constructor (address payable initiator, uint i, uint j) public payable{
        X = initiator;
        board[i][j] = 1;
        bounty = msg.value;
        stage = 1;
        lastTurn = X;
        numberOfTurns = 1;
    }
    
    function join(uint i, uint j) public payable{
        require(msg.value >= bounty);
        require(msg.sender != X);
        require(stage==1);

        require(board[i][j] == 0);
        
        board[i][j] = 2;
        O = msg.sender;
        bounty += msg.value;
        stage=2;
        lastTurn=O;
        numberOfTurns++;
    }
    
    function play(uint i, uint j) public{
        require(stage==2);
        require(board[i][j] == 0);
        
        if (lastTurn == X) {
            require(msg.sender == O);
            board[i][j] = 2;
            lastTurn=O;
        } else {
            require(msg.sender == X);
            board[i][j] = 1;
            lastTurn=X;
        }
        
        numberOfTurns++;
        
        bool won = checkWinner(i, j, lastTurn);
        if (won) {
            refunds[winner] = bounty;
            stage = 3;
        } else if (numberOfTurns == 9) {
            uint refund = bounty/2;
            refunds[X] = refund;
            refunds[O] = address(this).balance - refund;
            stage = 3;
        }
        
        
        
    }
    
    function checkWinner(uint i, uint j, address payable player) private returns (bool){
        uint8 c = board[i][j];
        
        for(uint x = 0; x < 3; x++){
            if(board[x][j] != c)
                break;
            if(x == 2){
                winner = player;
                return true;
            }
        }
        
        for(uint y = 0; y < 3; y++){
            if(board[i][y] != c)
                break;
            if(y == 2){
                winner = player;
                return true;
            }
        }
        
        if (i != j){
            if (i+j != 2) {
                return false;
            }
            for(uint x = 0; x < 3; x++){
                if(board[x][(2)-x] != c)
                    break;
                if(x == 2){
                    winner = player;
                    return true;
                }
            }
            
        } else {
            for(uint x = 0; x < 3; x++){
                if(board[x][x] != c)
                    break;
                if(x == 2){
                    winner = player;
                    return true;
                }
            }
        }
    }
    
    function claimRefund() public {
        uint refund = refunds[msg.sender];
        require(refund > 0);
        refunds[msg.sender]=0;
        msg.sender.transfer(refund);
    }

    function getDetails() public view returns(
        address, address, uint8[3][3] memory, address, uint8, address, uint, uint 
    ) {
        return (
            X,
            O,
            board,
            lastTurn,
            stage,
            winner,
            bounty,
            numberOfTurns
        );

    }
    
}