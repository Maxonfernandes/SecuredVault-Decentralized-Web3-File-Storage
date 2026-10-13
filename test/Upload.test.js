const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Upload Contract", function () {
  let Upload, upload, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    Upload = await ethers.getContractFactory("Upload");
    upload = await Upload.deploy();
    await upload.deployed();
  });

  describe("File Upload (add)", function () {
    it("Should allow a user to add a file URL for themselves", async function () {
      const url = "https://gateway.pinata.cloud/ipfs/QmTestHash1";
      await upload.connect(owner).add(owner.address, url);

      const files = await upload.connect(owner).display(owner.address);
      expect(files.length).to.equal(1);
      expect(files[0]).to.equal(url);
    });

    it("Should revert if URL is empty", async function () {
      await expect(
        upload.connect(owner).add(owner.address, "")
      ).to.be.revertedWith("URL cannot be empty");
    });

    it("Should prevent user from adding file to another user's vault", async function () {
      const url = "https://gateway.pinata.cloud/ipfs/QmMalicious";
      await expect(
        upload.connect(addr1).add(owner.address, url)
      ).to.be.revertedWith("Can only add files to your own account");
    });
  });

  describe("Access Control (allow & disallow)", function () {
    it("Should prevent unauthorized users from viewing files", async function () {
      const url = "https://gateway.pinata.cloud/ipfs/QmSecretFile";
      await upload.connect(owner).add(owner.address, url);

      await expect(
        upload.connect(addr1).display(owner.address)
      ).to.be.revertedWith("You don't have access");
    });

    it("Should allow access after calling allow()", async function () {
      const url = "https://gateway.pinata.cloud/ipfs/QmSecretFile";
      await upload.connect(owner).add(owner.address, url);

      await upload.connect(owner).allow(addr1.address);

      const files = await upload.connect(addr1).display(owner.address);
      expect(files.length).to.equal(1);
      expect(files[0]).to.equal(url);
    });

    it("Should reject allow for self or zero address", async function () {
      await expect(
        upload.connect(owner).allow(owner.address)
      ).to.be.revertedWith("Cannot allow yourself");

      await expect(
        upload.connect(owner).allow(ethers.constants.AddressZero)
      ).to.be.revertedWith("Cannot allow zero address");
    });

    it("Should revoke access after calling disallow()", async function () {
      const url = "https://gateway.pinata.cloud/ipfs/QmSecretFile";
      await upload.connect(owner).add(owner.address, url);

      await upload.connect(owner).allow(addr1.address);
      expect((await upload.connect(addr1).display(owner.address)).length).to.equal(1);

      await upload.connect(owner).disallow(addr1.address);

      await expect(
        upload.connect(addr1).display(owner.address)
      ).to.be.revertedWith("You don't have access");
    });

    it("Should return correct shareAccess list", async function () {
      await upload.connect(owner).allow(addr1.address);
      await upload.connect(owner).allow(addr2.address);

      let list = await upload.connect(owner).shareAccess();
      expect(list.length).to.equal(2);
      expect(list[0].user).to.equal(addr1.address);
      expect(list[0].access).to.equal(true);
      expect(list[1].user).to.equal(addr2.address);
      expect(list[1].access).to.equal(true);

      await upload.connect(owner).disallow(addr1.address);
      list = await upload.connect(owner).shareAccess();
      expect(list[0].access).to.equal(false);
      expect(list[1].access).to.equal(true);
    });
  });
});
