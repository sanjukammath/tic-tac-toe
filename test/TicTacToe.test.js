const assert = require("assert");
const ganache = require("ganache-cli");
const Web3 = require("web3");

const compiledGameManager = require("../build/contracts/GameManager.json");
const compiledGame = require("../build/contracts/TicTacToe.json");

const web3 = new Web3(ganache.provider());

let accounts;
let gameManager;
let gameAddress;
let game;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  factory = await new web3.eth.Contract(JSON.parse(compiledGameManager[abi]))
    .deploy({ data: compiledGameManager.bytecode })
    .send({ from: accounts[0], gas: "1000000" });

  //   await factory.methods.createGame("1000").send({
  //     from: accounts[0],
  //     gas: "1000000"
  //   });

  //   [gameAddress] = await factory.methods.getDeployedGames().call();

  //   game = await new web3.eth.Contract(
  //     JSON.parse(compiledCampaign.abi),
  //     gameAddress
  //   );
});

describe("TicTacToe", () => {
  //   it("deploys a factory and a game", () => {
  //     assert.ok(factory.options.address);
  //     assert.ok(game.options.address);
  //   });
  //   it("sets 'X' address correctly", async () => {
  //     const initator = await campaign.methods.X().call();
  //     assert.strictEqual(accounts[0], initator);
  //   });
  //   it("sets minimum contribution correctly", async () => {
  //     const minimum = await campaign.methods.minimumContribution().call();
  //     assert.strictEqual("100", minimum);
  //   });
  //   it("requires minimum contribution for participation", async () => {
  //     try {
  //       await campaign.methods.contribute().send({
  //         value: "50",
  //         from: accounts[1]
  //       });
  //       assert(false);
  //     } catch {
  //       assert(true);
  //     }
  //   });
  //   it("allows contribution and adds approvers", async () => {
  //     await campaign.methods.contribute().send({
  //       value: "200",
  //       from: accounts[1]
  //     });
  //     const isContributor = await campaign.methods.approvers(accounts[1]).call();
  //     assert(isContributor);
  //   });
  //   it("allows manager to make a payment request", async () => {
  //     const recipient = accounts[2];
  //     await campaign.methods
  //       .createRequest("Battery Casings", "100", recipient)
  //       .send({
  //         from: accounts[0],
  //         gas: 1000000
  //       });
  //     const request = await campaign.methods.requests(0).call();
  //     assert.strictEqual("Battery Casings", request.description);
  //     assert.strictEqual("100", request.value);
  //     assert.strictEqual(recipient, request.recipient);
  //     assert(!request.complete);
  //   });
  //   it("processes requests", async () => {
  //     await campaign.methods.contribute().send({
  //       value: web3.utils.toWei("10", "ether"),
  //       from: accounts[0]
  //     });
  //     await campaign.methods
  //       .createRequest(
  //         "Battery Casings",
  //         web3.utils.toWei("5", "ether"),
  //         accounts[1]
  //       )
  //       .send({ from: accounts[0], gas: 1000000 });
  //     await campaign.methods.approveRequest(0).send({
  //       from: accounts[0],
  //       gas: "1000000"
  //     });
  //     await campaign.methods.finalizeRequest(0).send({
  //       from: accounts[0],
  //       gas: "1000000"
  //     });
  //     let balance = await web3.eth.getBalance(accounts[1]);
  //     balance = web3.utils.fromWei(balance, "ether");
  //     balance = parseFloat(balance);
  //     assert(balance > 104);
  //   });
});
