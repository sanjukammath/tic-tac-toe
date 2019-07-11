const {
  BN,
  constants,
  expectEvent,
  expectRevert
} = require("openzeppelin-test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const Game = artifacts.require("TicTacToe");
const TGToken = artifacts.require("TGToken");

contract("TicTacToe", function([manager, X, O, dummy]) {
  const ZERO = new BN(0);
  const ONE = new BN(1);
  const value = new BN(2);
  const timeout = new BN(10);
  const initialSupply = new BN(100);
  let initialNumber;
  let initialGameBalance;
  let initialXBalance;
  beforeEach(async function() {
    this.token = await TGToken.new(initialSupply);
    this.game = await Game.new(this.token.address);
  });

  describe("initial variables", function() {
    describe("tokenAddress", function() {
      it("returns address of the token contract", async function() {
        expect(await this.game.tokenAddress()).to.be.equal(this.token.address);
      });
    });
    describe("number of games", function() {
      it("returns number of games", async function() {
        expect(await this.game.numberOfGames()).to.be.bignumber.equal(ZERO);
      });
    });
  });

  describe("bid", function() {
    describe("when bidder has not approved contract to spend tokens", function() {
      it("reverts", async function() {
        await expectRevert(
          this.game.bid(value, timeout, {
            from: X
          }),
          "contract not allowed to spend stake amount"
        );
      });
    });
    describe("when bidder has approved contract to spend tokens", function() {
      beforeEach("bid", async function() {
        await this.token.requestTokens({ from: X });
        await this.token.approve(this.game.address, value, { from: X });
      });
      describe("when there is not enough token to spend", function() {
        beforeEach("bid", async function() {
          const balanceX = await this.token.balanceOf(X);
          await this.token.transfer(manager, balanceX, { from: X });
        });
        it("reverts", async function() {
          await expectRevert(
            this.game.bid(value, timeout, {
              from: X
            }),
            "SafeMath: subtraction overflow"
          );
        });
      });
      describe("when there are enough tokens to spend", function() {
        beforeEach("bid", async function() {
          initialNumber = await this.game.numberOfGames();
          initialGameBalance = await this.token.balanceOf(this.game.address);
          initialXBalance = await this.token.balanceOf(X);
          const { logs } = await this.game.bid(value, timeout, { from: X });
          this.logs = logs;
        });

        it("increments the number of Games", async function() {
          const expectedNumber = initialNumber.add(ONE);
          expect(await this.game.numberOfGames()).to.be.bignumber.equal(
            expectedNumber
          );
        });

        it("gets the tokens from bidder", async function() {
          let expectedBalance = initialGameBalance.add(value);
          expect(
            await this.token.balanceOf(this.game.address)
          ).to.be.bignumber.equal(expectedBalance);

          expectedBalance = initialXBalance.sub(value);
          expect(await this.token.balanceOf(X)).to.be.bignumber.equal(
            expectedBalance
          );
        });

        describe("getBidDetails", function() {
          it("fetches bid details correctly", async function() {
            const details = await this.game.getBidDetails(initialNumber);

            expect(details[0]).to.be.equal(X);
            expect(details[1]).to.be.equal(ZERO_ADDRESS);
            expect(details[2]).to.be.bignumber.equal(value);
            expect(details[3]).to.be.bignumber.equal(ZERO);
            expect(details[4]).to.be.bignumber.equal(timeout);
          });
        });
      });
      afterEach("bid", async function() {
        const balanceX = await this.token.balanceOf(X);
        await this.token.transfer(manager, balanceX, { from: X });
      });
    });
  });

  describe("accept", function() {
    beforeEach("accept, X has to bid", async function() {
      initialNumber = await this.game.numberOfGames();
      await this.token.requestTokens({ from: X });
      await this.token.approve(this.game.address, value, { from: X });
      await this.game.bid(value, timeout, { from: X });
    });
    afterEach("accept, clean up tokens", async function() {
      const balanceX = await this.token.balanceOf(X);
      await this.token.transfer(manager, balanceX, { from: X });
      const balanceO = await this.token.balanceOf(O);
      await this.token.transfer(manager, balanceO, { from: O });
    });
    describe("when bidder is trying to accept the bid", function() {
      beforeEach("accept", async function() {
        await this.token.requestTokens({ from: X });
        await this.token.approve(this.game.address, value, { from: X });
      });
      it("reverts", async function() {
        await expectRevert(
          this.game.accept(initialNumber, {
            from: X
          }),
          "one cannot accept own bid"
        );
      });
    });
    describe("when acceptor has not approved contract to spend tokens", function() {
      it("reverts", async function() {
        await expectRevert(
          this.game.accept(initialNumber, {
            from: O
          }),
          "contract not allowed to spend stake amount"
        );
      });
    });
    describe("when acceptor has approved contract to spend tokens", function() {
      beforeEach("accept", async function() {
        await this.token.requestTokens({ from: O });
        await this.token.approve(this.game.address, value, { from: O });
      });
      describe("when there is not enough token to spend", function() {
        beforeEach("accept", async function() {
          const balanceO = await this.token.balanceOf(O);
          await this.token.transfer(manager, balanceO, { from: O });
        });
        it("reverts", async function() {
          await expectRevert(
            this.game.accept(initialNumber, {
              from: O
            }),
            "SafeMath: subtraction overflow"
          );
        });
      });
      describe("when there are enough tokens to spend", function() {
        beforeEach("accept", async function() {
          initialGameBalance = await this.token.balanceOf(this.game.address);
          initialOBalance = await this.token.balanceOf(O);
          const { logs } = await this.game.accept(initialNumber, { from: O });
          this.logs = logs;
        });

        it("gets the tokens from bidder", async function() {
          let expectedBalance = initialGameBalance.add(value);
          expect(
            await this.token.balanceOf(this.game.address)
          ).to.be.bignumber.equal(expectedBalance);

          expectedBalance = initialOBalance.sub(value);
          expect(await this.token.balanceOf(O)).to.be.bignumber.equal(
            expectedBalance
          );
        });

        it("emits the Accepted event", async function() {
          expectEvent.inLogs(this.logs, "Accepted", {
            id: initialNumber,
            responder: O
          });
        });

        describe("getBidDetails", function() {
          it("fetches bid details correctly", async function() {
            const details = await this.game.getBidDetails(initialNumber);

            expect(details[0]).to.be.equal(X);
            expect(details[1]).to.be.equal(O);
            expect(details[2]).to.be.bignumber.equal(value.add(value));
            expect(details[3]).to.be.bignumber.equal(ONE);
            expect(details[4]).to.be.bignumber.equal(timeout);
          });
        });
      });
    });

    describe("when someone is trying to bid an already accepted bid", function() {
      beforeEach("dummy accept, O has to accept", async function() {
        await this.token.requestTokens({ from: O });
        await this.token.approve(this.game.address, value, { from: O });
        await this.game.accept(initialNumber, { from: O });
        await this.token.requestTokens({ from: dummy });
        await this.token.approve(this.game.address, value, { from: dummy });
      });
      afterEach("dummy accept, clean up tokens", async function() {
        const balanceDummy = await this.token.balanceOf(dummy);
        await this.token.transfer(manager, balanceDummy, { from: dummy });
      });
      it("reverts", async function() {
        await expectRevert(
          this.game.accept(initialNumber, {
            from: dummy
          }),
          "This bid is not available for accepting"
        );
      });
    });
    describe("when someone is trying to bid a not created bid", function() {
      beforeEach("dummy accept, O has to accept", async function() {
        await this.token.requestTokens({ from: dummy });
        await this.token.approve(this.game.address, value, { from: dummy });
      });
      afterEach("dummy accept, clean up tokens", async function() {
        const balanceDummy = await this.token.balanceOf(dummy);
        await this.token.transfer(manager, balanceDummy, { from: dummy });
      });
      it("reverts", async function() {
        await expectRevert(
          this.game.accept(initialNumber.add(ONE), {
            from: dummy
          }),
          "The bid is not yet created"
        );
      });
    });
  });

  describe("start", function() {
    const initialRow = ONE;
    const initialCol = ONE;
    beforeEach("start, bid has to be created and accepted", async function() {
      initialNumber = await this.game.numberOfGames();
      await this.token.requestTokens({ from: X });
      await this.token.approve(this.game.address, value, { from: X });
      await this.game.bid(value, timeout, { from: X });
    });
    afterEach("start, clean up tokens", async function() {
      const balanceX = await this.token.balanceOf(X);
      await this.token.transfer(manager, balanceX, { from: X });
      const balanceO = await this.token.balanceOf(O);
      await this.token.transfer(manager, balanceO, { from: O });
    });
    describe("when trying to start a game for which bid has not yet been created", async function() {
      it("reverts", async function() {
        await expectRevert(
          this.game.start(initialNumber.add(ONE), initialRow, initialCol, {
            from: dummy
          }),
          "Create a bid before starting the game!"
        );
      });
    });
    describe("when creating game for an existing bid", function() {
      describe("when bid has not been accepted yet", function() {
        it("reverts", async function() {
          await expectRevert(
            this.game.start(initialNumber, initialRow, initialCol, {
              from: X
            }),
            "wait for the bid to be acceted before starting a game"
          );
        });
      });
      describe("when bid has been accepted", function() {
        beforeEach("start, O has to accept", async function() {
          await this.token.requestTokens({ from: O });
          await this.token.approve(this.game.address, value, { from: O });
          await this.game.accept(initialNumber, { from: O });
        });
        describe("when O plays the first move", function() {
          it("reverts", async function() {
            await expectRevert(
              this.game.start(initialNumber, initialRow, initialCol, {
                from: O
              }),
              "only the bidder can make the first move"
            );
          });
        });
        describe("when X plays the first move", function() {
          describe("when X sends invalid row and col as input", function() {
            it("reverts", async function() {
              await expectRevert(
                this.game.start(initialNumber, new BN(3), new BN(3), {
                  from: X
                }),
                "index out of bound"
              );
            });
          });
          describe("when X sends valid row and col as input", function() {
            describe("when the game is already started one", function() {
              beforeEach("invalid start, start the game", async function() {
                await this.game.start(initialNumber, initialRow, initialCol, {
                  from: X
                });
              });
              it("reverts", async function() {
                await expectRevert(
                  this.game.start(initialNumber, initialRow, initialCol, {
                    from: X
                  }),
                  "the game for this bid has already been started once"
                );
              });
            });
            describe("when the game is not yet started", function() {
              beforeEach("start", async function() {
                const { logs } = await this.game.start(
                  initialNumber,
                  initialRow,
                  initialCol,
                  {
                    from: X
                  }
                );
                this.logs = logs;
              });
              it("records the game details correctly", async function() {
                const details = await this.game.getGameDetails(initialNumber);

                expect(details[0]).to.be.equal(X);
                expect(details[1]).to.be.equal(O);
                expect(details[2]).to.be.bignumber.equal(ZERO);
                expect(details[3]).to.be.bignumber.equal(ONE);
                expect(details[4]).to.be.equal(ZERO_ADDRESS);
              });

              it("records the board for the game correctly", async function() {
                const board = await this.game.getBoard(initialNumber);

                expect(board[4]).to.be.bignumber.equal(ONE);
              });

              it("emits the started event", function() {
                expectEvent.inLogs(this.logs, "Started", {
                  id: initialNumber,
                  row: ONE,
                  col: ONE
                });
              });
            });
          });
        });
      });
    });
  });

  // describe("save", function() {
  //   beforeEach("save, create a game and start it", async function() {
  //     initialNumber = await this.game.numberOfGames();
  //     await this.token.requestTokens({ from: X });
  //     await this.token.approve(this.game.address, value, { from: X });
  //     await this.game.bid(value, timeout, { from: X });
  //     await this.token.requestTokens({ from: O });
  //     await this.token.approve(this.game.address, value, { from: O });
  //     await this.game.accept(initialNumber, { from: O });
  //   });
  //   describe("when trying to save a game not yet started", function() {
  //     it("reverts", async function() {});
  //   });
  //   describe("when the game is started", function() {
  //     beforeEach("save, start the game", function() {
  //       await this.game.start(initialNumber, ONE, ONE, {
  //         from: X
  //       });
  //     });
  //     describe("when the game is completed already", function() {

  //     });
  //   });
  // });
});
