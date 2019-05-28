const GameManager = artifacts.require("GameManager");
const TicTacToe = artifacts.require("TicTacToe");

const value = web3.utils.toWei(".002", "ether");

contract("TicTacToe create a game", accounts => {
  let managerInstance;
  beforeEach("setup a TicTacToe contract", async () => {
    managerInstance = await GameManager.deployed();
  });
  it("should be deployed by GameManager contract", async () => {
    await managerInstance.createGame(1, 1, { from: accounts[1], value: value });
    const gameAddress = await managerInstance.lastGame();
    const game = await TicTacToe.at(gameAddress);
    const X = await game.X();
    const bounty = await game.bounty();
    const balance = await web3.eth.getBalance(gameAddress);
    const mark = await game.board(1, 1);

    assert.strictEqual(accounts[1], X);
    assert.strictEqual(Number(value), Number(bounty));
    assert.strictEqual(balance, Number(bounty) + "");
    assert.strictEqual(1, Number(mark));
  });
  it("should not let to deploy a game without bounty", async () => {
    try {
      await managerInstance.createGame(1, 1, { from: accounts[1], value: 1 });
      assert(false);
    } catch {
      assert(true);
    }
  });
});

contract("TicTacToe lets a person join the game", accounts => {
  let game;
  let gameAddress;
  beforeEach("setup a TicTacToe contract", async () => {
    const managerInstance = await GameManager.deployed();
    await managerInstance.createGame(1, 1, { from: accounts[1], value: value });

    gameAddress = await managerInstance.lastGame();
    game = await TicTacToe.at(gameAddress);
  });
  it("should let a second party to join", async () => {
    await game.join(0, 0, { from: accounts[2], value: value });
    const stage = await game.stage();
    const bounty = await game.bounty();
    const balance = await web3.eth.getBalance(gameAddress);
    const mark = await game.board(0, 0);
    const expected = web3.utils.toWei(".004", "ether");

    assert.strictEqual(2, Number(stage));
    assert.strictEqual(Number(expected), Number(bounty));
    assert.strictEqual(balance, Number(bounty) + "");
    assert.strictEqual(2, Number(mark));
  });
  it("should not let same party to be initiator and responder", async () => {
    try {
      await game.join(0, 0, { from: accounts[1], value: value });
      assert(false);
    } catch {
      assert(true);
    }
  });
  it("should not let responder to join with lesser bid", async () => {
    try {
      await game.join(0, 0, { from: accounts[2], value: 999 });
      assert(false);
    } catch {
      assert(true);
    }
  });
  it("should not let responder to mark the same box", async () => {
    try {
      await game.join(1, 1, { from: accounts[2], value: 1000 });
      assert(false);
    } catch {
      assert(true);
    }
  });
});

contract("TicTacToe declares winner correctly", accounts => {
  let game;
  let gameAddress;
  const X = accounts[1];
  const O = accounts[2];

  beforeEach("setup a TicTacToe contract", async () => {
    const managerInstance = await GameManager.deployed();
    await managerInstance.createGame(1, 1, { from: X, value: value });

    gameAddress = await managerInstance.lastGame();
    game = await TicTacToe.at(gameAddress);
    await game.join(0, 0, { from: O, value: value });
    await game.play(0, 1, { from: X });
    await game.play(1, 0, { from: O });
    await game.play(2, 1, { from: X });
  });
  it("records the winner correctly", async () => {
    const winner = await game.winner();
    const winnerRefund = await game.refunds(X);
    const balance = await web3.eth.getBalance(gameAddress);
    const stage = await game.stage();

    assert.strictEqual(X, winner);
    assert.strictEqual(balance, Number(winnerRefund) + "");
    assert.strictEqual(3, Number(stage));
  });
  it("ends the game after winning", async () => {
    try {
      await game.play(2, 2, { from: O });
      assert(false);
    } catch {
      assert(true);
    }
  });
  it("lets the winner pull money", async () => {
    const initialBalance = await web3.eth.getBalance(X);
    await game.claimRefund({ from: X });
    const finalBalance = await web3.eth.getBalance(X);
    assert(finalBalance > initialBalance);
  });
});
