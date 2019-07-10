const {
  BN,
  constants,
  expectEvent,
  expectRevert
} = require("openzeppelin-test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const TGToken = artifacts.require("TGToken");

contract("TGToken", function([manager, sender, receiver, dummy]) {
  const initialSupply = new BN(100);

  beforeEach(async function() {
    this.token = await TGToken.new(initialSupply);
  });

  describe("total supply", function() {
    it("returns the total amount of tokens", async function() {
      expect(await this.token.totalSupply()).to.be.bignumber.equal(
        initialSupply
      );
    });
  });

  describe("balanceOf", function() {
    describe("when the requested account has no tokens", function() {
      it("returns zero", async function() {
        expect(await this.token.balanceOf(dummy)).to.be.bignumber.equal("0");
      });
    });

    describe("when the requested account has some tokens", function() {
      it("returns the total amount of tokens", async function() {
        expect(await this.token.balanceOf(manager)).to.be.bignumber.equal(
          initialSupply
        );
      });
    });
  });

  describe("transfer", function() {
    shouldBehaveLikeERC20Transfer(
      "ERC20",
      manager,
      receiver,
      initialSupply,
      function(from, to, value) {
        return this.token.transfer(to, value, { from });
      }
    );
  });

  describe("approve", function() {
    shouldBehaveLikeERC20Approve(
      "ERC20",
      manager,
      receiver,
      initialSupply,
      function(owner, spender, amount) {
        return this.token.approve(spender, amount, { from: owner });
      }
    );
  });

  describe("transfer from", function() {
    const spender = receiver;

    describe("when the token owner is not the zero address", function() {
      const tokenOwner = manager;

      describe("when the recipient is not the zero address", function() {
        const to = dummy;

        describe("when the spender has enough approved balance", function() {
          beforeEach(async function() {
            await this.token.approve(spender, initialSupply, {
              from: tokenOwner
            });
          });

          describe("when the token owner has enough balance", function() {
            const amount = initialSupply;

            it("transfers the requested amount", async function() {
              await this.token.transferFrom(tokenOwner, to, amount, {
                from: spender
              });

              expect(
                await this.token.balanceOf(tokenOwner)
              ).to.be.bignumber.equal("0");

              expect(await this.token.balanceOf(to)).to.be.bignumber.equal(
                amount
              );
            });

            it("decreases the spender allowance", async function() {
              await this.token.transferFrom(tokenOwner, to, amount, {
                from: spender
              });

              expect(
                await this.token.allowance(tokenOwner, spender)
              ).to.be.bignumber.equal("0");
            });

            it("emits a transfer event", async function() {
              const { logs } = await this.token.transferFrom(
                tokenOwner,
                to,
                amount,
                { from: spender }
              );

              expectEvent.inLogs(logs, "Transfer", {
                from: tokenOwner,
                to: to,
                value: amount
              });
            });

            it("emits an approval event", async function() {
              const { logs } = await this.token.transferFrom(
                tokenOwner,
                to,
                amount,
                { from: spender }
              );

              expectEvent.inLogs(logs, "Approval", {
                owner: tokenOwner,
                spender: spender,
                value: await this.token.allowance(tokenOwner, spender)
              });
            });
          });

          describe("when the token owner does not have enough balance", function() {
            const amount = initialSupply.addn(1);

            it("reverts", async function() {
              await expectRevert(
                this.token.transferFrom(tokenOwner, to, amount, {
                  from: spender
                }),
                "SafeMath: subtraction overflow"
              );
            });
          });
        });

        describe("when the spender does not have enough approved balance", function() {
          beforeEach(async function() {
            await this.token.approve(spender, initialSupply.subn(1), {
              from: tokenOwner
            });
          });

          describe("when the token owner has enough balance", function() {
            const amount = initialSupply;

            it("reverts", async function() {
              await expectRevert(
                this.token.transferFrom(tokenOwner, to, amount, {
                  from: spender
                }),
                "SafeMath: subtraction overflow"
              );
            });
          });

          describe("when the token owner does not have enough balance", function() {
            const amount = initialSupply.addn(1);

            it("reverts", async function() {
              await expectRevert(
                this.token.transferFrom(tokenOwner, to, amount, {
                  from: spender
                }),
                "SafeMath: subtraction overflow"
              );
            });
          });
        });
      });

      describe("when the recipient is the zero address", function() {
        const amount = initialSupply;
        const to = ZERO_ADDRESS;

        beforeEach(async function() {
          await this.token.approve(spender, amount, { from: tokenOwner });
        });

        it("reverts", async function() {
          await expectRevert(
            this.token.transferFrom(tokenOwner, to, amount, { from: spender }),
            `ERC20: transfer to the zero address`
          );
        });
      });
    });

    describe("when the token owner is the zero address", function() {
      const amount = 0;
      const tokenOwner = ZERO_ADDRESS;
      const to = receiver;

      it("reverts", async function() {
        await expectRevert(
          this.token.transferFrom(tokenOwner, to, amount, { from: spender }),
          `ERC20: transfer from the zero address`
        );
      });
    });
  });

  describe("mint", function() {
    const amount = new BN(50);
    let initialBalance;
    it("rejects a request from non owner", async function() {
      await expectRevert(
        this.token.mint(amount, { from: sender }),
        "TGT: Only token manager can mint"
      );
    });

    describe("when owner mints", function() {
      beforeEach("minting", async function() {
        initialBalance = await this.token.balanceOf(manager);
        const { logs } = await this.token.mint(amount, { from: manager });
        this.logs = logs;
      });

      it("increments totalSupply", async function() {
        const expectedSupply = initialSupply.add(amount);
        expect(await this.token.totalSupply()).to.be.bignumber.equal(
          expectedSupply
        );
      });

      it("increments manager balance", async function() {
        const expectedBalance = initialBalance.add(amount);
        expect(await this.token.balanceOf(manager)).to.be.bignumber.equal(
          expectedBalance
        );
      });

      it("emits Transfer event", async function() {
        const event = expectEvent.inLogs(this.logs, "Transfer", {
          from: ZERO_ADDRESS,
          to: manager
        });

        expect(event.args.value).to.be.bignumber.equal(amount);
      });
    });
  });

  describe("requestTokens", function() {
    const elligibility = new BN(5);
    let managerBalance;
    let requestorBalance;
    describe("when requestor does not have enough tokens", async function() {
      const requestor = dummy;
      describe("when manager has tokens to fulfill request", async function() {
        beforeEach("request", async function() {
          managerBalance = await this.token.balanceOf(manager);
          requestorBalance = await this.token.balanceOf(requestor);
          const { logs } = await this.token.requestTokens({ from: requestor });
          this.logs = logs;
        });
        afterEach("request", async function() {
          requestorBalance = await this.token.balanceOf(requestor);
          await this.token.transfer(manager, requestorBalance, {
            from: requestor
          });
        });

        it("decrements manager balance", async function() {
          const expectedBalance = managerBalance.sub(elligibility);
          expect(await this.token.balanceOf(manager)).to.be.bignumber.equal(
            expectedBalance
          );
        });

        it("increments requestor balance", async function() {
          const expectedBalance = requestorBalance.add(elligibility);
          expect(await this.token.balanceOf(requestor)).to.be.bignumber.equal(
            expectedBalance
          );
        });

        it("emits Transfer event", async function() {
          const event = expectEvent.inLogs(this.logs, "Transfer", {
            from: manager,
            to: requestor
          });

          expect(event.args.value).to.be.bignumber.equal(elligibility);
        });
      });

      describe("when manager does not have tokens to fulfill request", function() {
        let managerBalance;
        beforeEach("request", async function() {
          managerBalance = await this.token.balanceOf(manager);
          await this.token.transfer(sender, managerBalance, {
            from: manager
          });
        });
        afterEach("request", async function() {
          await this.token.transfer(manager, managerBalance, {
            from: sender
          });
        });

        it("reverts", async function() {
          await expectRevert(
            this.token.requestTokens({ from: requestor }),
            "TGT: All tokens in supply have been distributed"
          );
        });
      });
    });
    describe("when requestor has enough tokens", function() {
      const requestor = dummy;
      beforeEach("request", async function() {
        await this.token.transfer(requestor, elligibility, { from: manager });
      });

      afterEach("request", async function() {
        requestorBalance = await this.token.balanceOf(requestor);
        await this.token.transfer(manager, requestorBalance, {
          from: requestor
        });
      });

      it("reverts", async function() {
        await expectRevert(
          this.token.requestTokens({ from: requestor }),
          "TGT: Requestor has enough tokens"
        );
      });
    });
  });
});

function shouldBehaveLikeERC20Transfer(
  errorPrefix,
  from,
  to,
  balance,
  transfer
) {
  describe("when the recipient is not the zero address", function() {
    describe("when the sender does not have enough balance", function() {
      const amount = balance.addn(1);

      it("reverts", async function() {
        await expectRevert(
          transfer.call(this, from, to, amount),
          "SafeMath: subtraction overflow"
        );
      });
    });

    describe("when the sender transfers all balance", function() {
      const amount = balance;

      it("transfers the requested amount", async function() {
        await transfer.call(this, from, to, amount);

        expect(await this.token.balanceOf(from)).to.be.bignumber.equal("0");

        expect(await this.token.balanceOf(to)).to.be.bignumber.equal(amount);
      });

      it("emits a transfer event", async function() {
        const { logs } = await transfer.call(this, from, to, amount);

        expectEvent.inLogs(logs, "Transfer", {
          from,
          to,
          value: amount
        });
      });
    });

    describe("when the sender transfers zero tokens", function() {
      const amount = new BN("0");

      it("transfers the requested amount", async function() {
        await transfer.call(this, from, to, amount);

        expect(await this.token.balanceOf(from)).to.be.bignumber.equal(balance);

        expect(await this.token.balanceOf(to)).to.be.bignumber.equal("0");
      });

      it("emits a transfer event", async function() {
        const { logs } = await transfer.call(this, from, to, amount);

        expectEvent.inLogs(logs, "Transfer", {
          from,
          to,
          value: amount
        });
      });
    });
  });

  describe("when the recipient is the zero address", function() {
    it("reverts", async function() {
      await expectRevert(
        transfer.call(this, from, ZERO_ADDRESS, balance),
        `${errorPrefix}: transfer to the zero address`
      );
    });
  });
}

function shouldBehaveLikeERC20Approve(
  errorPrefix,
  owner,
  spender,
  supply,
  approve
) {
  describe("when the spender is not the zero address", function() {
    describe("when the sender has enough balance", function() {
      const amount = supply;

      it("emits an approval event", async function() {
        const { logs } = await approve.call(this, owner, spender, amount);

        expectEvent.inLogs(logs, "Approval", {
          owner: owner,
          spender: spender,
          value: amount
        });
      });

      describe("when there was no approved amount before", function() {
        it("approves the requested amount", async function() {
          await approve.call(this, owner, spender, amount);

          expect(
            await this.token.allowance(owner, spender)
          ).to.be.bignumber.equal(amount);
        });
      });

      describe("when the spender had an approved amount", function() {
        beforeEach(async function() {
          await approve.call(this, owner, spender, new BN(1));
        });

        it("approves the requested amount and replaces the previous one", async function() {
          await approve.call(this, owner, spender, amount);

          expect(
            await this.token.allowance(owner, spender)
          ).to.be.bignumber.equal(amount);
        });
      });
    });

    describe("when the sender does not have enough balance", function() {
      const amount = supply.addn(1);

      it("emits an approval event", async function() {
        const { logs } = await approve.call(this, owner, spender, amount);

        expectEvent.inLogs(logs, "Approval", {
          owner: owner,
          spender: spender,
          value: amount
        });
      });

      describe("when there was no approved amount before", function() {
        it("approves the requested amount", async function() {
          await approve.call(this, owner, spender, amount);

          expect(
            await this.token.allowance(owner, spender)
          ).to.be.bignumber.equal(amount);
        });
      });

      describe("when the spender had an approved amount", function() {
        beforeEach(async function() {
          await approve.call(this, owner, spender, new BN(1));
        });

        it("approves the requested amount and replaces the previous one", async function() {
          await approve.call(this, owner, spender, amount);

          expect(
            await this.token.allowance(owner, spender)
          ).to.be.bignumber.equal(amount);
        });
      });
    });
  });

  describe("when the spender is the zero address", function() {
    it("reverts", async function() {
      await expectRevert(
        approve.call(this, owner, ZERO_ADDRESS, supply),
        `${errorPrefix}: approve to the zero address`
      );
    });
  });
}
