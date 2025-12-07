import { expect } from "chai";
import { ethers } from "hardhat";
import { BettingContract } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Viem'den gelen sabitler
const ONE_ETH = ethers.parseEther("1");
const HALF_ETH = ethers.parseEther("0.5");
const LARGE_TOLERANCE = ethers.parseEther("0.5");

// Outcome enum karşılıkları:
// 0: PENDING, 1: TEAM_A_WINS, 2: TEAM_B_WINS, 3: DRAW

describe("BettingContract", function () {
  let bettingContract: BettingContract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  before(async () => {
    // Test için adresleri al
    [owner, user1, user2] = await ethers.getSigners();
  });

  beforeEach(async () => {
    // Her testten önce sözleşmeyi yeniden dağıt
    const BettingContractFactory = await ethers.getContractFactory("BettingContract");
    bettingContract = (await BettingContractFactory.deploy()) as BettingContract;
    await bettingContract.waitForDeployment();
  });

  // --- 1. Dağıtım Testleri ---
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await bettingContract.owner()).to.equal(owner.address);
    });

    it("Should start with PENDING outcome", async function () {
      expect(await bettingContract.currentOutcome()).to.equal(0n); // 0 = PENDING
    });
  });

  // --- 2. Bahis Koyma Testleri (placeBet) ---
  describe("Placing Bets (placeBet)", function () {
    it("Should allow placing a bet with value", async function () {
      await expect(bettingContract.connect(user1).placeBet(1, { value: ONE_ETH }))
        .to.emit(bettingContract, "BetPlaced")
        .withArgs(user1.address, ONE_ETH, 1);

      // Sözleşme bakiyesini kontrol et
      expect(await ethers.provider.getBalance(await bettingContract.getAddress())).to.equal(ONE_ETH);
      // Toplam bahis miktarını kontrol et
      expect(await bettingContract.totalBetsForOutcome(1)).to.equal(ONE_ETH);
    });

    it("Should NOT allow placing a bet with 0 value", async function () {
      // Bahis miktarının 0'dan büyük olması gerekir
      await expect(bettingContract.connect(user1).placeBet(1, { value: 0 })).to.be.revertedWith(
        "Amount must be greater than zero.",
      );
    });

    it("Should NOT allow betting on PENDING outcome (0)", async function () {
      // PENDING sonucuna bahis konulamaz
      await expect(bettingContract.connect(user1).placeBet(0, { value: ONE_ETH })).to.be.revertedWith(
        "Invalid prediction.",
      );
    });
  });

  // --- 3. Sonuç Açıklama ve Ödeme Testleri (announceResult) ---
  describe("Announcing Results and Payments (announceResult)", function () {
    beforeEach(async () => {
      // Test senaryosu için iki farklı kullanıcı bahis yapıyor
      // User1: 1 ETH, TEAM_A_WINS (1)
      await bettingContract.connect(user1).placeBet(1, { value: ONE_ETH });
      // User2: 0.5 ETH, TEAM_A_WINS (1)
      await bettingContract.connect(user2).placeBet(1, { value: HALF_ETH });
      // Sözleşme toplam bakiyesi: 1.5 ETH
    });

    it("Should NOT allow non-owner to announce result", async function () {
      // Sadece owner çağırabilir (onlyOwner)
      await expect(bettingContract.connect(user1).announceResult(1)).to.be.revertedWith(
        "Only owner can call this function.",
      );
    });

    it("Should distribute winnings correctly to multiple winners", async function () {
      // User1 ve User2'nin başlangıç bakiyelerini kaydet
      const user1InitialBalance = await ethers.provider.getBalance(user1.address);
      const user2InitialBalance = await ethers.provider.getBalance(user2.address);

      // Sonucu ilan et: TEAM_A_WINS (1)
      await bettingContract.connect(owner).announceResult(1);

      // Sözleşme bakiyesini kontrol et (sıfıra yakın olmalı)
      

      // Toplam havuz: 1.5 ETH. Dağıtım: 1.5 ETH * (Bahis/Toplam Bahis)
      // User1'in Payı (1 ETH / 1.5 ETH) * 1.5 ETH = 1 ETH (Geri ödenen tutar)
      // User2'nin Payı (0.5 ETH / 1.5 ETH) * 1.5 ETH = 0.5 ETH (Geri ödenen tutar)

      // Ödemelerden sonraki bakiyeleri kontrol et.
      // Herkes kendi yatırdığı parayı geri almalıdır (basit pool/payout mantığı).
      // Başlangıç bakiyesi + Geri ödenen para - Gas ücreti = Son bakiye

      // User1: Başlangıç Bakiyesi + 1 ETH - Gas
      expect(await ethers.provider.getBalance(user1.address)).to.be.closeTo(user1InitialBalance + ONE_ETH, LARGE_TOLERANCE,);

      // User2: Başlangıç Bakiyesi + 0.5 ETH - Gas
      expect(await ethers.provider.getBalance(user2.address)).to.be.closeTo(
        user2InitialBalance + HALF_ETH,
        LARGE_TOLERANCE,
      );
    });

    it("Should NOT pay out if result is a loss", async function () {
      const user1InitialBalance = await ethers.provider.getBalance(user1.address);

      // Sonucu ilan et: TEAM_B_WINS (2) -> User1 ve User2 kaybeder
      await bettingContract.connect(owner).announceResult(2);

      // User1'in bakiyesi neredeyse hiç değişmemeli (sadece gas ücretleri kadar düşüş olmalı)
      expect(await ethers.provider.getBalance(user1.address)).to.be.closeTo(user1InitialBalance, ONE_ETH / 10n);

      // Tüm para kontratta kalır (Çünkü kazanan yok)
      expect(await ethers.provider.getBalance(await bettingContract.getAddress())).to.equal(ONE_ETH + HALF_ETH);
    });
  });

  // --- 4. Fon Çekme Testi (withdrawFunds) ---
  describe("Owner Withdrawal (withdrawFunds)", function () {
    it("Should NOT allow non-owner to withdraw funds", async function () {
      await bettingContract.connect(user1).placeBet(1, { value: ONE_ETH });

      // User1'in çekme denemesi başarısız olmalı
      await expect(bettingContract.connect(user1).withdrawFunds()).to.be.revertedWith(
        "Only owner can call this function.",
      );
    });

    it("Should allow owner to withdraw contract balance after all payouts", async function () {
      // 1. User1 bahis koyar
      await bettingContract.connect(user1).placeBet(1, { value: ONE_ETH });

      // 2. Yanlış sonuç ilan edilir (Kimse kazanmaz), para kontratta kalır
      await bettingContract.connect(owner).announceResult(2);
      
      const contractBalance = await ethers.provider.getBalance(await bettingContract.getAddress());
      const ownerInitialBalance = await ethers.provider.getBalance(owner.address);

      // Owner tüm bakiyeyi çekmeli
      await expect(bettingContract.connect(owner).withdrawFunds())
        .to.emit(bettingContract, "OwnerWithdrewFunds"); // Ödeme emit edilmeli (fon çekme de WinningsPaid emit ediyor)

      // Owner'ın bakiyesi (Başlangıç + Kontrat Bakiyesi - Gas) olmalı
      expect(await ethers.provider.getBalance(owner.address)).to.be.closeTo(
        ownerInitialBalance + contractBalance,
        LARGE_TOLERANCE,
      );
      
      // Sözleşme bakiyesi sıfıra düşmeli
      expect(await ethers.provider.getBalance(await bettingContract.getAddress())).to.equal(0n);
    });
  });
});