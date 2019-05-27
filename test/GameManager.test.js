const GameManager = artifacts.require("GameManager");

contract("GameManager", accounts => {
  it("should deploy multiple TicTacToe contracts", async () => {
    const managerInstance = await GameManager.deployed();
    await managerInstance.createGame(1, 1, { from: accounts[1], value: 1000 });

    let deployedGames = await managerInstance.getDeployedGames();

    assert.ok(deployedGames[0]);

    await managerInstance.createGame(1, 1, { from: accounts[1], value: 1000 });

    deployedGames = await managerInstance.getDeployedGames();

    assert.ok(deployedGames[1]);
  });
});
