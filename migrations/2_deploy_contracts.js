var TicTacToe = artifacts.require("TicTacToe");

module.exports = function(deployer) {
  deployer.deploy(TicTacToe);
  // Additional contracts can be deployed here
};
