const GameManager = artifacts.require("GameManager");

contract("GameManager", accounts => {
  const value = web3.utils.toWei(".002", "ether");
  it("should deploy multiple TicTacToe contracts", async () => {
    const managerInstance = await GameManager.deployed();
    await managerInstance.createGame(1, 1, { from: accounts[1], value: value });

    let deployedGames = await managerInstance.getDeployedGames();

    assert.ok(deployedGames[0]);

    await managerInstance.createGame(1, 1, { from: accounts[1], value: value });

    deployedGames = await managerInstance.getDeployedGames();

    assert.ok(deployedGames[1]);
  });
});
