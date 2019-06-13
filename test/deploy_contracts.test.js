const TicTacToe = artifacts.require("TicTacToe");
const TGToken = artifacts.require("TGToken");

contract("Token", async accounts => {
  it("gets deployed properly", async () => {
    const game = await TicTacToe.deployed();

    const token = await TGToken.deployed();
    const tokenAddress = token.address;

    const recordedAddress = await game.tokenAddress();
    const isMinterMe = await token.isMinter(accounts[0]);
    const isMinterGame = await token.isMinter(game.address);

    assert.strictEqual(recordedAddress, tokenAddress);
    assert.strictEqual(false, isMinterMe);
    assert.strictEqual(true, isMinterGame);
  });
});
