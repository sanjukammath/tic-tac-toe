const TicTacToe = artifacts.require("TicTacToe");

const value = web3.utils.toWei(".002", "ether");

contract("TicTacToe emits events correctly", async accounts => {
  let game;
  let gameAddress;
  const X = accounts[1];
  const O = accounts[2];
  let numberOfGames;
  let index;

  beforeEach("setup a TicTacToe contract", async () => {
    game = await TicTacToe.deployed();
    gameAddress = game.address;

    await game.createGame(1, 1, { from: accounts[1], value: value });

    numberOfGames = await game.numberOfGames();
    index = Number(numberOfGames) - 1;
  });
  it("emits the join event", async () => {
    const event = game.allEvents();

    event.on("data", data => {
      assert.equal("Joined", data.event);
      assert.equal(O, data.args.responder);
      event.removeAllListeners();
    });
    await game.join(index, 0, 0, { from: O, value: value });
  });
  it("emits the play event once", async () => {
    await game.join(index, 0, 0, { from: O, value: value });
    const event = game.allEvents();

    event.on("data", data => {
      assert.equal("Played", data.event);
      assert.equal(X, data.args.player);
      event.removeAllListeners();
    });
    await game.play(index, 2, 2, { from: X });
  });
  it("emits the Over event on win", async () => {
    await game.join(index, 0, 0, { from: O, value: value });
    await game.play(index, 0, 1, { from: X });
    await game.play(index, 1, 0, { from: O });

    const event = game.allEvents();

    event.on("data", data => {
      assert.equal("Over", data.event);
      assert.equal("Won", data.args.result);
      event.removeAllListeners();
    });
    await game.play(index, 2, 1, { from: X });
  });
  it("emits the Over event on draw", async () => {
    await game.join(index, 0, 0, { from: O, value: value });
    await game.play(index, 2, 2, { from: X });
    await game.play(index, 0, 2, { from: O });
    await game.play(index, 0, 1, { from: X });
    await game.play(index, 2, 1, { from: O });
    await game.play(index, 1, 0, { from: X });
    await game.play(index, 1, 2, { from: O });

    const event = game.allEvents();

    event.on("data", data => {
      assert.equal("Over", data.event);
      assert.equal("Draw", data.args.result);
      event.removeAllListeners();
    });
    await game.play(index, 2, 0, { from: X });
  });
});
