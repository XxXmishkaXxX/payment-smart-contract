import { expect } from "chai";
import { ethers } from "hardhat";
import { PaymentContract } from "../typechain-types";

describe("PaymentContract", function () {
  let paymentContract: PaymentContract;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const PaymentContractFactory = await ethers.getContractFactory("PaymentContract");
    paymentContract = await PaymentContractFactory.deploy();
    await paymentContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await paymentContract.owner()).to.equal(owner.address);
    });

    it("Should start with zero balance", async function () {
      expect(await paymentContract.getBalance()).to.equal(0);
    });

    it("Should start with zero payments", async function () {
      expect(await paymentContract.getPaymentsCount()).to.equal(0);
    });
  });

  describe("Payments", function () {
    it("Should accept payment via makePayment()", async function () {
      const amount = ethers.parseEther("0.1");
      
      await expect(paymentContract.connect(user1).makePayment({ value: amount }))
        .to.emit(paymentContract, "PaymentReceived")
        .withArgs(user1.address, amount, (value: any) => typeof value === "bigint");

      expect(await paymentContract.getPaymentsCount()).to.equal(1);
      expect(await paymentContract.getBalance()).to.equal(amount);
    });

    it("Should accept payment via receive()", async function () {
      const amount = ethers.parseEther("0.05");
      
      await expect(
        user1.sendTransaction({
          to: await paymentContract.getAddress(),
          value: amount,
        })
      ).to.emit(paymentContract, "PaymentReceived");

      expect(await paymentContract.getPaymentsCount()).to.equal(1);
    });

    it("Should reject zero payment", async function () {
      await expect(
        paymentContract.connect(user1).makePayment({ value: 0 })
      ).to.be.revertedWith("Payment amount must be greater than 0");
    });

    it("Should store payment information correctly", async function () {
      const amount = ethers.parseEther("0.2");
      await paymentContract.connect(user1).makePayment({ value: amount });

      const payment = await paymentContract.getPayment(0);
      expect(payment.sender).to.equal(user1.address);
      expect(payment.amount).to.equal(amount);
    });

    it("Should handle multiple payments", async function () {
      await paymentContract.connect(user1).makePayment({ value: ethers.parseEther("0.1") });
      await paymentContract.connect(user2).makePayment({ value: ethers.parseEther("0.2") });

      expect(await paymentContract.getPaymentsCount()).to.equal(2);
      expect(await paymentContract.getBalance()).to.equal(ethers.parseEther("0.3"));
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      await paymentContract.connect(user1).makePayment({ value: ethers.parseEther("1.0") });
    });

    it("Should allow owner to withdraw", async function () {
      const amount = ethers.parseEther("0.5");
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await paymentContract.connect(owner).withdraw(amount);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.be.closeTo(
        ownerBalanceBefore + amount - gasUsed,
        ethers.parseEther("0.01")
      );

      expect(await paymentContract.getBalance()).to.equal(ethers.parseEther("0.5"));
    });

    it("Should allow owner to withdraw all", async function () {
      await paymentContract.connect(owner).withdrawAll();
      expect(await paymentContract.getBalance()).to.equal(0);
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        paymentContract.connect(user1).withdraw(ethers.parseEther("0.1"))
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should not allow withdrawal of more than balance", async function () {
      await expect(
        paymentContract.connect(owner).withdraw(ethers.parseEther("2.0"))
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("View functions", function () {
    beforeEach(async function () {
      await paymentContract.connect(user1).makePayment({ value: ethers.parseEther("0.1") });
      await paymentContract.connect(user2).makePayment({ value: ethers.parseEther("0.2") });
    });

    it("Should return correct payment count", async function () {
      expect(await paymentContract.getPaymentsCount()).to.equal(2);
    });

    it("Should return all payments", async function () {
      const [senders, amounts, timestamps] = await paymentContract.getAllPayments();
      
      expect(senders.length).to.equal(2);
      expect(senders[0]).to.equal(user1.address);
      expect(senders[1]).to.equal(user2.address);
      expect(amounts[0]).to.equal(ethers.parseEther("0.1"));
      expect(amounts[1]).to.equal(ethers.parseEther("0.2"));
    });

    it("Should revert when getting payment with invalid index", async function () {
      await expect(paymentContract.getPayment(10)).to.be.revertedWith("Payment index out of bounds");
    });
  });
});

