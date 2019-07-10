pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract ERC20Interface {
    function totalSupply() public view returns (uint);
    function balanceOf(address tokenOwner) public view returns (uint balance);
    function allowance(address tokenOwner, address spender) public view returns (uint remaining);
    function transfer(address to, uint tokens) public returns (bool success);
    function approve(address spender, uint tokens) public returns (bool success);
    function transferFrom(address from, address to, uint tokens) public returns (bool success);

    event Transfer(address indexed from, address indexed to, uint tokens);
    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}

contract TicTacToe {
    using SafeMath for uint256;
    
    event Accepted (uint id, address responder);
    event Started (uint id, address player);
    event Saved (uint id, address player, int8[9] board);
    event Closed (uint id, string result, address winner);
    
    address public tokenAddress;
    uint public numberOfGames;
    mapping(address => uint) public refund;
    
    enum BidStates {Created, Accepted, Started, Disbursed}

    struct Bid{
        address bidder;
        uint value;
        address acceptor;
        BidStates state;
        uint startDate;
        uint bidTimeOut;
    }
    
    mapping(uint => Bid) public bids;
    
    enum GameStates {Started, Closed, Drew , Won}
    
    
    struct Game{
        address X;
        address O;
        mapping(uint8 => mapping(uint8 => int8)) board;
        GameStates state;
        uint bidId;
        uint8 numberOfTurns;
        address winner;
    }
    
    mapping(uint => Game) public games;

    constructor (address a) public {
        tokenAddress = a;
        numberOfGames = 0;
    }

    function bid (uint stake, uint timeOut) public {
        uint256 approvedTokens = ERC20Interface(tokenAddress).allowance(msg.sender, address(this));
        require(stake < approvedTokens, "contract not allowed to spend stake amount");
        require(ERC20Interface(tokenAddress).transferFrom(msg.sender, address(this), stake), "transfer of tokens failed");
        
        Bid memory newBid = Bid({
            bidder: msg.sender,
            value: stake,
            acceptor: address(0),
            state: BidStates.Created,
            startDate: now,
            bidTimeOut: timeOut
        });
        
        bids[numberOfGames] = newBid;
        numberOfGames.add(1);
    }
    
    function accept(uint id) public{
        Bid storage currentBid = bids[id];
        uint value = currentBid.value;
        require(currentBid.state == BidStates.Created, "This bid is not available for accepting");
        uint256 approvedTokens = ERC20Interface(tokenAddress).allowance(msg.sender, address(this));
        require(value < approvedTokens, "contract not allowed to spend stake amount");
        require(ERC20Interface(tokenAddress).transferFrom(msg.sender, address(this), value), "transfer of tokens failed");
        
        currentBid.acceptor = msg.sender;
        currentBid.state = BidStates.Accepted;
        currentBid.value = value.add(value);
        
        emit Accepted(id, msg.sender);
    }
    
    function start(uint id, uint8 row, uint8 col) public{
        Bid storage currentBid = bids[id];
        require(currentBid.state == BidStates.Accepted, "wait for the bid to be acceted before starting a game");
        require(msg.sender == currentBid.bidder, "only the bidder can make the first move");
        require(row < 3 && col < 3, "index out of bound");
        
        uint8 turns = games[id].numberOfTurns;
        require(turns == 0, "the game has already been started once");
        
        Game memory newGame = Game({
           X: msg.sender,
           O: address(0),
           state: GameStates.Started,
           bidId: id,
           numberOfTurns: 1, 
           winner: address(0)
        });
        games[id] = newGame;
        Game storage currentGame = games[id];
        currentGame.board[row][col] = 1;
        
        currentBid.state = BidStates.Started;
        emit Started(id, msg.sender);
    }
    
    function save(uint id, int8[9] memory board,  uint8 v, bytes32 r, bytes32 s, uint8 nonce, bool close) public{
        Game storage currentGame = games[id];
        require(currentGame.state == GameStates.Started, "There is nothing to save");
        require(nonce < 10, "invalid nonce");
        require(currentGame.numberOfTurns < nonce, "Trying to save older state");
        require(msg.sender == currentGame.X || msg.sender == currentGame.O, "Not a player in this game");
        
        bytes memory e = abi.encode(address(this), id, board, nonce);
        bytes32 h = keccak256(e);
        
        address signer = ecrecover(h, v, r, s);
        
        if (msg.sender == currentGame.X) {
            require(signer == currentGame.O, "You need attestation from opponent");
        } else {
            require(signer == currentGame.X, "You need attestation from opponent");
        }
        
        saveBoard(currentGame, board);
        
        currentGame.numberOfTurns = nonce;
        
        emit Saved(id, msg.sender, board);
        
        if (close){
            (bool won, address winner) = checkWinner(currentGame);
            
            if (won) {
                currentGame.winner = winner;
                currentGame.state = GameStates.Won;
                
                Bid storage currentBid = bids[id];
                currentBid.state = BidStates.Disbursed;
                
                ERC20Interface(tokenAddress).transfer(winner, currentBid.value);
                
                emit Closed(id, "Game Won", winner);
            } else if(currentGame.numberOfTurns == 9) {
                currentGame.state = GameStates.Drew;
                
                Bid storage currentBid = bids[id];
                currentBid.state = BidStates.Disbursed;
                uint drawRefund = currentBid.value/2;
                
                ERC20Interface(tokenAddress).transfer(currentGame.X, drawRefund);
                ERC20Interface(tokenAddress).transfer(currentGame.O, currentBid.value - drawRefund);
                
                emit Closed(id, "Game Draw", address(0));
            } else {
                require(false, "Game cannot be closed without a result. If you want to just save send close as false");
            }
        }
    }
    
    function timeOut(uint id) public{
        Game storage currentGame = games[id];
        Bid storage currentBid = bids[id];
        require(msg.sender == currentBid.bidder || msg.sender == currentBid.acceptor, "Not a player in this game");
        
        require(currentBid.state != BidStates.Disbursed, "Bid has already been paid out");
        
        require(currentBid.startDate + currentBid.bidTimeOut > now, "Bid timeOut has not occured yet");
        
        BidStates state = currentBid.state;
        
        currentGame.state = GameStates.Closed;
        currentBid.state = BidStates.Disbursed;
        
        
        if (state==BidStates.Created){
            ERC20Interface(tokenAddress).transfer(currentBid.bidder, currentBid.value);
        } else{
            uint closedRefund = currentBid.value/2;
                
            ERC20Interface(tokenAddress).transfer(currentBid.bidder, closedRefund);
            ERC20Interface(tokenAddress).transfer(currentBid.acceptor, currentBid.value - closedRefund);
        }
        
    }
    
    function saveBoard(Game storage game, int8[9] memory board) private {
        uint8 x = 0;

        for (uint8 i = 0; i < 3; i++){
            for (uint8 j = 0; j < 3; j++) {
                int8 c = board[x];
                require(c < 3 && c >= 0, "invalid mark in the boad");
                game.board[i][j] = c;
                x++;
            }
        }
    }
    
    function getBidDetails(uint id) public view returns(address, address, uint, BidStates, uint){
        Bid memory currentBid = bids[id];
        return (currentBid.bidder, currentBid.acceptor, currentBid.value, currentBid.state, currentBid.bidTimeOut);
    }
    
    function getGameDetails(uint id) public view returns(address, address, GameStates, uint8){
        Game memory game = games[id];
        return (game.X, game.O, game.state, game.numberOfTurns);
    }
    
    function getBoard(uint g) public view returns (int8[9] memory board) {
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
    
    function checkWinner(Game storage currentGame) private view returns (bool won, address winner){
        uint8 i;
        mapping(uint8 => mapping(uint8 => int8)) storage currentBoard = currentGame.board;
        
        for (i = 0; i<3; i++){
            int8 rowSum = currentBoard[i][0] + currentBoard[i][1] + currentBoard[i][2];
            int8 colSum = currentBoard[0][i] + currentBoard[1][i] + currentBoard[2][i];
            if (rowSum == 3 || colSum == 3){
                return (true, currentGame.X);
            } else if (rowSum == -3 || colSum == -3){
                return (true, currentGame.O);
            }
        }
        
        int8 dSum = currentBoard[0][0] + currentBoard[1][1] + currentBoard[2][2];
        int8 rSum = currentBoard[2][0] + currentBoard[1][1] + currentBoard[0][2];
        
        if (dSum == 3 || rSum == 3){
            return (true, currentGame.X);
        } else if (dSum == -3 || rSum == -3){
            return (true, currentGame.O);
        }
        
        return (false, address(0));
    }
    
}