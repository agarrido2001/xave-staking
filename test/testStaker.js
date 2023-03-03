const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Test Staking", function () {
    let XVC;
    let sXVC;
    let wXVC;
    let staker;

    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addrs;

    // change to "true" to print a stake list at the end
    var printStake = false;

    before(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners()

        let initialSupply = ethers.utils.parseEther("10000000000")

        const Token = await ethers.getContractFactory("TestToken")
    
        XVC = await Token.deploy("XaveCoin", "XVC", initialSupply)
        await XVC.deployed()

        sXVC = await Token.deploy("S XaveCoin", "sXVC", initialSupply)
        await sXVC.deployed()

        wXVC = await Token.deploy("W XaveCoin", "wXVC", initialSupply)
        await wXVC.deployed()

        console.log("XVC, sXVC, wXVC deployed with initialSupply", initialSupply.toString())

        let Staker = await ethers.getContractFactory("Staker")
        staker = await Staker.deploy(XVC.address, [sXVC.address, wXVC.address])
        await staker.deployed();

        console.log("Staker deployed with reward token XVC and stake tokens sXVC and wXVC")
    });

    it("Try to stake a token not listed", async function () {
        await expect(staker.connect(addr1).stake(XVC.address, ethers.utils.parseEther("101"))).to.be.revertedWith(
            "stakingToken not listed")
    });

    it("Try to stake less than minimum amount", async function () {
        let minStakeAmt = await staker.minStakingAmount()
        await expect(staker.connect(addr1).stake(sXVC.address, minStakeAmt.sub(1))).to.be.revertedWith(
            "Invalid staking amount")
    });

    it("Need allowance before staking", async function () {
        await expect(staker.connect(addr1).stake(sXVC.address, ethers.utils.parseEther("101"))).to.be.revertedWith(
            "Need more allowance of stakingToken")

        //give some allowance
        await sXVC.connect(addr1).approve(staker.address, ethers.utils.parseEther("101"))
    });

    it("Not enought XVC supply", async function () {
        await expect(staker.connect(addr1).stake(sXVC.address, ethers.utils.parseEther("101"))).to.be.revertedWith(
            "Not enough supply of rewarding token")

        //Transfer some XVC to staker
        let newSupply = ethers.utils.parseEther("1000000")
        await XVC.transfer(staker.address, newSupply)
        expect(await XVC.balanceOf(staker.address)).to.eq(newSupply)
    });

    it("Addr1 does not have enought sXVC", async function () {
        await expect(staker.connect(addr1).stake(sXVC.address, ethers.utils.parseEther("101"))).to.be.revertedWith(
            "ERC20: burn amount exceeds balance")

        sXVC.transfer(addr1.address,ethers.utils.parseEther("1000"))
    });
   
    it("Addr1 finally STAKES 100eth sXVC. Validate sXVC has been burned", async function () {
        //Store prev sXVC suplly
        let sXVCsuppply = await sXVC.totalSupply()

        await staker.connect(addr1).stake(sXVC.address, ethers.utils.parseEther("100"))

        //100 sXVC should has been burned
        let newsXVCsuppply = await sXVC.totalSupply()
        expect(newsXVCsuppply).to.eq(sXVCsuppply.sub(ethers.utils.parseEther("100")))

        //Addr1 checks its staking data
        let stakingData = await staker.connect(addr1).getMyStakingData()
        expect(stakingData[0].amtTotal).to.eq(ethers.utils.parseEther("125"))
    });

    it("Change the network timestamp: add 30 days", async function () {
        let days = 60*60*24*30
        let latestBlock = await hre.ethers.provider.getBlockNumber()
        let block = await ethers.provider.getBlock(latestBlock)
        const prevTime = block.timestamp

        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")

        latestBlock = await hre.ethers.provider.getBlockNumber()
        block = await ethers.provider.getBlock(latestBlock)

        expect(block.timestamp).to.greaterThanOrEqual(prevTime + days)
    });

    it("Addr1 should not have any amount available, yet", async function () {
        expect(await staker.connect(addr1).computeMyTokens()).to.eq(0)
    });

    it("Change the network timestamp: add another 60 days (total 90 days)", async function () {
        let days = 60*60*24*60
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("Addr1 still should not have any amount available, yet", async function () {
        expect(await staker.connect(addr1).computeMyTokens()).to.eq(0)
    });

    it("Change the network timestamp: add another 30 days (total 120 days)", async function () {
        let days = 60*60*24*30
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("Addr1 should have available 125/3 = 41666666666666666666", async function () {
        let amount = await staker.connect(addr1).computeMyTokens()
        expect(amount).to.eq("41666666666666666666")
    });

    it("Change the network timestamp: add another 30 days (total 150 days)", async function () {
        let days = 60*60*24*30
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("Addr1 should have available (125/3)*2 = 83333333333333333332", async function () {
        let amount = await staker.connect(addr1).computeMyTokens()
        expect(amount).to.eq("83333333333333333332")
    });

    it("Change the network timestamp: add another 30 days (total 180 days)", async function () {
        let days = 60*60*24*30
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });
    
    it("Addr1 should have available all its staking tokens = 125000000000000000000", async function () {
        let amount = await staker.connect(addr1).computeMyTokens()
        expect(amount).to.eq("125000000000000000000")
    });

    it("Change the network timestamp: add another 30 days (total 210 days)", async function () {
        let days = 60*60*24*30
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("Addr1 should still have = 125000000000000000000", async function () {
        let amount = await staker.connect(addr1).computeMyTokens()
        expect(amount).to.eq("125000000000000000000")
    });

    it("Addr1 withdraws all its available tokens. Check addr1 balance", async function () {
        const bal = await XVC.balanceOf(addr1.address)
        expect(bal).to.eq(0)

        const trx = await staker.connect(addr1).withdraw()
        await trx.wait()
        const balAfter = await XVC.balanceOf(addr1.address)

        expect(balAfter).to.eq(125000000000000000000n)
    });

    it("New user Addr2 stakes 40000000eth wXVC", async function () {
        const stakeAmount = ethers.utils.parseEther("40000000")
        // transfer wXVC to addr2
        await wXVC.transfer(addr2.address, stakeAmount)
        // Transfer XVC to staker (stakeAmount * 2)
        await XVC.transfer(staker.address, stakeAmount.mul(2))
        // addr2 gis allowance to staker
        await wXVC.connect(addr2).approve(staker.address, stakeAmount)
        // addr2 stakes all its wXVC
        await staker.connect(addr2).stake(wXVC.address, stakeAmount)
    });

    it("Change the network timestamp: add 135 days ", async function () {
        let days = 60*60*24*135
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("addr2 withdraws its tokens. Should be 16666666666666666666666666n", async function () {
        let amount = await staker.connect(addr2).computeMyTokens()
        expect(amount).to.eq(16666666666666666666666666n)
        let trx = await staker.connect(addr2).withdraw()
        await trx.wait()
        expect(await XVC.balanceOf(addr2.address)).to.eq(amount)
    });

    it("addr2 should not have available tokens, since it withdraw them all", async function () {
        amount = await staker.connect(addr2).computeMyTokens()
        expect(amount).to.eq(0)        
    });

    it("Change the network timestamp: add 15 days (total 150 days) ", async function () {
        let days = 60*60*24*15
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("addr2 should have 16666666666666666666666666 tokens available", async function () {
        amount = await staker.connect(addr2).computeMyTokens()
        expect(amount).to.eq(16666666666666666666666666n)
    });

    it("Change the network timestamp: add 90 days (total 240 days) ", async function () {
        let days = 60*60*24*90
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("addr2 should have 33333333333333333333333334 tokens available", async function () {
        amount = await staker.connect(addr2).computeMyTokens()
        expect(amount).to.eq(33333333333333333333333334n)
    });
        
    it("addr2 takes all its available tokens. Its XVC balabce should be 50000000000000000000000000 ", async function () {
        let trx = await staker.connect(addr2).withdraw()
        await trx.wait()
        // console.log( await XVC.balanceOf(addr2.address))
        let bal = await XVC.balanceOf(addr2.address)
        expect(bal).to.eq(50000000000000000000000000n)

        expect(await staker.connect(addr2).computeMyTokens()).to.eq(0)
    });

    it("addr2 should not have available tokens, since it withdraw them all", async function () {
        amount = await staker.connect(addr2).computeMyTokens()
        expect(amount).to.eq(0)        
    });





    const stakeAmt1 = ethers.utils.parseEther("40000000")
    const stakeAmt2 = ethers.utils.parseEther("30000000")
    const stakeAmt3 = ethers.utils.parseEther("25555555")
    it("addr3 stakes 40000000", async function () {

        console.log("\t --- New user addr3 stakes at 3 different months ---")

        // Transfer XVC to staker (all stake amt* 2)
        await XVC.transfer(staker.address, stakeAmt1.add(stakeAmt2).add(stakeAmt3).mul(2))
        // transfer wXVC to addr2
        await wXVC.transfer(addr3.address, stakeAmt1.add(stakeAmt2).add(stakeAmt3)  )

        // addr3 gives allowance to staker
        await wXVC.connect(addr3).approve(staker.address, stakeAmt1.add(stakeAmt2).add(stakeAmt3))


        await sXVC.transfer(addr3.address, stakeAmt1.add(stakeAmt2).add(stakeAmt3)  )
        await sXVC.connect(addr3).approve(staker.address, stakeAmt1.add(stakeAmt2).add(stakeAmt3))

        
        //stakes 40000000
        //gives 16666666666666666666666666 a month
        await staker.connect(addr3).stake(wXVC.address, stakeAmt1)
    });

    it("move 120 days", async function () {
        //move 120 days
        let days = 60*60*24*120
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("addr3 should have 16666666666666666666666666n", async function () {
        amount = await staker.connect(addr3).computeMyTokens()
        expect(amount).to.eq(16666666666666666666666666n)
    });

    it("addr3 sakes 30000000", async function () {
        //gives 12500000000000000000000000 a month
        await staker.connect(addr3).stake(wXVC.address, stakeAmt2)
    });

    it("move 120 days (total 240)", async function () {
        //advance 120 days
        days = 60*60*24*120
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("addr3 should have 62500000000000000000000000n", async function () {
        //amount should be (166666 * 3 + left over)+ 1250000
        amount = await staker.connect(addr3).computeMyTokens()
        expect(amount).to.eq(62500000000000000000000000n)
    });

    it("move 30 days (total 270)", async function () {
        days = 60*60*24*30
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("addr3 should have 75000000000000000000000000n", async function () {
        amount = await staker.connect(addr3).computeMyTokens()
        expect(amount).to.eq(75000000000000000000000000n)
    });

    it("addr3 sakes 25555555", async function () {
        //gives 10648147916666666666666666 a month
        await staker.connect(addr3).stake(sXVC.address, stakeAmt3)
    });

    it("move 90 days (total 360)", async function () {
        days = 60*60*24*90
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("addr3 should have 87500000000000000000000000", async function () {
        amount = await staker.connect(addr3).computeMyTokens()
        expect(amount).to.eq(87500000000000000000000000n)
    });  

    it("addr3 withdraws. Should have 87500000000000000000000000 moved to is wallet", async function () {
        let trx = await staker.connect(addr3).withdraw()
        await trx.wait()
        let bal = await XVC.balanceOf(addr3.address)
        expect(bal).to.eq(87500000000000000000000000n)
        let available = await staker.connect(addr3).computeMyTokens()
        expect(available).to.eq(0)

        //console.log(await staker.getStakingData(addr3.address))
    });

    it("move 30 days (total 390)", async function () {
        days = 60*60*24*30
        await network.provider.send("evm_increaseTime", [days])
        await network.provider.send("evm_mine")
    });

    it("addr3 should have 10648147916666666666666666", async function () {
        amount = await staker.connect(addr3).computeMyTokens()
        expect(amount).to.eq(10648147916666666666666666n)
        //console.log(await staker.connect(addr3).computeMyTokens())
    });  

    it("Staker has 134610985000000000000000000 tokens", async function () {
        amount = await XVC.balanceOf(staker.address)
        expect(amount).to.eq(134610985000000000000000000n)
    }); 

    it("Loked tokens should be: 31944443750000000000000000 ", async function () {
        amount = await staker.lockedRewardTokens()
        expect(amount).to.eq(31944443750000000000000000n)
    }); 

    it("owner takes all unloked XVC tokens: 102666541250000000000000000n", async function () {
        let prevBal = await XVC.balanceOf(owner.address)
        let prevBalS = await XVC.balanceOf(staker.address)

        let trx = await staker.withdrawBalance()
        await trx.wait()

        let newBal = await XVC.balanceOf(owner.address)
        let newBalS = await XVC.balanceOf(staker.address)

        //not used tokens
        let unUsed = 102666541250000000000000000n

        //owner should have all unused tokens after withdrawBalance()
        expect(newBal).to.eq(prevBal.add(unUsed))

        //Staker should have 
        expect(newBalS).to.eq(prevBalS.sub(unUsed))
    });
    
    it("Staker should ONLY have the tokens owed to addr3", async function () {
        //calculate what's owed to addr3 
        let totOwed = ethers.BigNumber.from(0)
        let myStake = await staker.connect(addr3).getMyStakingData()
        for (let i = 0; i < myStake.length; i++) {
            const s = myStake[i]
            totOwed = totOwed.add(s.amtTotal.sub(s.amtWithdrawn))
        }

        let bal = await XVC.balanceOf(staker.address)
        expect(bal).to.eq(totOwed)
    });

    it("no one can stake anymore", async function () {
        let amount = ethers.utils.parseEther("100")
        await wXVC.transfer(addr3.address, amount)
        wXVC.connect(addr3).approve(staker.address, amount)
        
        await expect(staker.connect(addr3).stake(wXVC.address, amount)).to.be.revertedWith(
            "Not enough supply of rewarding token")
        
    });
    
    if(printStake){
        it("Print stakes", async function () {
            console.log("addr1", await staker.getStakingData(addr1.address))
            console.log("addr2",await staker.getStakingData(addr2.address))
            console.log("addr3",await staker.getStakingData(addr3.address))
        });
    }        

});