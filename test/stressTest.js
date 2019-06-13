const TicTacToe = artifacts.require("TicTacToe");
const TGToken = artifacts.require("TGToken");

const value = web3.utils.toWei(".002", "ether");

contract("TicTacToe can support multiple games", async accounts => {
  let game;
  let gameAddress;
  const player1 = accounts[1];
  const player2 = accounts[2];
  const player3 = accounts[3];
  const player4 = accounts[4];
  const player5 = accounts[5];
  beforeEach("setup a TicTacToe contract", async () => {
    game = await TicTacToe.deployed();
    gameAddress = game.address;
  });

  it("should record all the properties of the game", async () => {
    await game.createGame(1, 1, { from: player1, value: value }); // game0
    await game.createGame(0, 1, { from: player1, value: value }); // game1
    await game.createGame(1, 1, { from: player2, value: value }); // game2
    await game.createGame(2, 1, { from: player3, value: value }); // game3
    await game.createGame(1, 1, { from: player4, value: value }); // game4
    await game.createGame(1, 1, { from: player5, value: value }); // game5

    const numberOfGames = await game.numberOfGames();

    assert.strictEqual(6, Number(numberOfGames));
    const index = 4;
    const { X, O, lastTurn, stage, result, bounty } = await game.games(index);

    const board = await game.getBoard(index);

    const balance = await web3.eth.getBalance(gameAddress);
    const mark = board[4];

    assert.strictEqual(player4, X);
    assert.strictEqual(player4, lastTurn);
    assert.strictEqual(0, Number(O));
    assert.strictEqual(Number(value), Number(bounty));
    assert.strictEqual(balance, Number(bounty) * 6 + "");
    assert.strictEqual(1, Number(mark));
    assert.strictEqual(false, result);
    assert.strictEqual(0, Number(stage));
  });
  it("allows game to progress parallely", async () => {
    let game0 = 0;
    let game2 = 2;
    let game3 = 3;
    let game4 = 4;
    let game5 = 5;
    await game.join(game0, 0, 0, { from: player2, value: value });
    await game.play(game0, 0, 1, { from: player1 });
    await game.play(game0, 1, 0, { from: player2 });
    await game.join(game2, 0, 0, { from: player5, value: value });
    await game.play(game2, 2, 2, { from: player2 });
    await game.join(game3, 1, 1, { from: player1, value: value });
    await game.play(game0, 2, 1, { from: player1 });
    await game.play(game3, 2, 2, { from: player3 });
    await game.play(game2, 0, 2, { from: player5 });
    await game.play(game3, 2, 0, { from: player1 });
    await game.play(game2, 0, 1, { from: player2 });
    await game.play(game2, 2, 1, { from: player5 });
    await game.join(game4, 0, 0, { from: player2, value: value });
    await game.play(game2, 1, 0, { from: player2 });
    await game.play(game2, 1, 2, { from: player5 });
    await game.play(game3, 1, 2, { from: player3 });
    await game.play(game3, 0, 2, { from: player1 });
    await game.play(game4, 1, 0, { from: player4 });
    await game.play(game4, 0, 1, { from: player2 });
    await game.play(game2, 2, 0, { from: player2 });
    await game.play(game4, 1, 2, { from: player4 });
    await game.join(game5, 0, 1, { from: player1, value: value });
    await game.play(game5, 1, 2, { from: player5 });
    await game.play(game5, 0, 2, { from: player1 });
    await game.play(game5, 0, 0, { from: player5 });
    await game.play(game5, 1, 0, { from: player1 });
    await game.play(game5, 2, 2, { from: player5 });

    let refund1 = await game.tokenBalance(player1); // 2 wins game0, game3
    let refund2 = await game.tokenBalance(player2); // 1 draw game2
    let refund3 = await game.tokenBalance(player3); // no wins or draw
    let refund4 = await game.tokenBalance(player4); // 1 win game4
    let refund5 = await game.tokenBalance(player5); // 1 draw, 1 win game2, game5

    assert.strictEqual(Number(4 * value), Number(refund1));
    assert.strictEqual(Number(value), Number(refund2));
    assert.strictEqual(0, Number(refund3));
    assert.strictEqual(Number(2 * value), Number(refund4));
    assert.strictEqual(Number(3 * value), Number(refund5));
  });
});
