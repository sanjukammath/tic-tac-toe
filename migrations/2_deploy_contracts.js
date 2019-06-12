const TGToken = artifacts.require("TGToken");
const TicTacToe = artifacts.require("TicTacToe");

module.exports = async deployer => {
  await deployer.deploy(TGToken);
  await deployer.deploy(TicTacToe, TGToken.address);

  const tokenInstance = await TGToken.deployed();

  await tokenInstance.addMinter(TicTacToe.address);
  await tokenInstance.renounceMinter();
};
