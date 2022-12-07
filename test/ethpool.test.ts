import { expect } from 'chai';
import { ethers } from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';

import { ETHPool, ETHPool__factory } from '../build/types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';

const { getContractFactory, getSigners } = ethers;

describe('ETHPool', () => {
    let ethPool: ETHPool;

    let admin, teamMember, userA, userB: SignerWithAddress;
    let newTeamMember: SignerWithAddress;

    beforeEach(async () => {
        [admin, teamMember, userA, userB, newTeamMember] = await getSigners();

        // Deploy ETHPool
        const ethPoolFactory = (await getContractFactory('ETHPool', admin)) as ETHPool__factory;
        ethPool = await ethPoolFactory.deploy();
        await ethPool.deployed();

        await ethPool.grantRole(ethPool.TEAM_MEMBER_ROLE(), teamMember.address);
    });

    it('Deployed contract address should has a proper address', async () => {
        expect(ethPool.address).to.be.a.properAddress;
    });

    it('Contract should have balance of 0 ETH', async () => {
        const balance = await ethers.provider.getBalance(ethPool.address);
        expect(balance).to.be.equal(BigNumber.from(0));
    });

    it('Admin should has an DEFAULT_ADMIN_ROLE role', async () => {
        const isAdmin = await ethPool.hasRole(ethPool.DEFAULT_ADMIN_ROLE(), admin.address);
        expect(isAdmin).to.be.true;
    });

    it('Team member should has an TEAM_MEMBER role', async () => {
        const isTeamMember = await ethPool.hasRole(ethPool.TEAM_MEMBER_ROLE(), teamMember.address);
        expect(isTeamMember).to.be.true;
    });

    describe('deposit', async () => {
        it('User should be able to deposit ETH into the pool', async () => {
            const amount = ethers.utils.parseEther('1');
            const tx = ethPool.connect(userA).deposit({ value: amount });

            await expect(tx).to.changeEtherBalance(userA.address, amount.mul(-1));
            await expect(tx).to.changeEtherBalance(ethPool.address, amount);

            await expect(tx).to.emit(ethPool, 'Deposit').withArgs(userA.address, 1, amount);
        });

        it('Should store the amount deposited and the amount to be withdrawn by the users for each week', async () => {
            const userA_amount = ethers.utils.parseEther('100');
            const userB_amount = ethers.utils.parseEther('300');

            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(userB).deposit({ value: userB_amount });

            const currentWeek = (await ethPool.getCurrentWeek()).toNumber();

            // DepositByAddress
            const depositedByAddress = {
                userA: await ethPool.depositedByAddress(currentWeek, userA.address),
                userB: await ethPool.depositedByAddress(currentWeek, userB.address),
            };

            expect(depositedByAddress.userA).to.be.equal(userA_amount);
            expect(depositedByAddress.userB).to.be.equal(userB_amount);

            // AmountToWithdraw
            const amountToWithdraw = {
                userA: await ethPool.amountToWithdraw(userA.address),
                userB: await ethPool.amountToWithdraw(userB.address),
            };

            expect(amountToWithdraw.userA).to.be.equal(userA_amount);
            expect(amountToWithdraw.userB).to.be.equal(userB_amount);

            // TotalDeposited
            const totalDeposited = await ethPool.totalDeposited(currentWeek);
            expect(totalDeposited).to.be.equal(userA_amount.add(userB_amount));
        });
    });

    describe('depositReward', async () => {
        it('Team member should deposit ETH as reward to the pool', async () => {
            const amount = ethers.utils.parseEther('1');
            const currentWeek = (await ethPool.getCurrentWeek()).toNumber();

            const tx = ethPool.connect(teamMember).depositReward({ value: amount });

            await expect(tx).to.changeEtherBalance(teamMember.address, amount.mul(-1));
            await expect(tx).to.changeEtherBalance(ethPool.address, amount);
            
            expect(await ethPool.rewardsDeposited(currentWeek)).to.be.equal(amount);

            await expect(tx).to.emit(ethPool, 'DepositReward').withArgs(teamMember.address, currentWeek, amount);
        });

        it('Week number should increment when a new reward deposit occurs', async () => {
            let currentWeek = (await ethPool.getCurrentWeek()).toNumber();
            expect(currentWeek).to.be.equal(1);

            await ethPool.connect(teamMember).depositReward({ value: 1 });

            currentWeek = (await ethPool.getCurrentWeek()).toNumber();
            expect(currentWeek).to.be.equal(2);
        });

        it('Team members can only deposit rewards once a week', async () => {
            const amount = ethers.utils.parseEther('1');
            
            await ethPool.connect(teamMember).depositReward({ value: amount });

            const revertedTx = ethPool.connect(teamMember).depositReward({ value: amount });
            await expect(revertedTx).to.be.revertedWith("Team members can only deposit rewards once a week");

            // Get last time reward was deposited
            const lastTimeDepositReward = (await ethPool.lastTimeDepositReward()).toNumber();

            // Increase time to almost a week and try again. It should be reverted.
            await ethers.provider.send("evm_setNextBlockTimestamp", [lastTimeDepositReward + 604799]);
            const revertedTx_2 = ethPool.connect(teamMember).depositReward({ value: amount });
            await expect(revertedTx_2).to.be.revertedWith("Team members can only deposit rewards once a week");

            // Increase time to a week since last reward deposited and try again. It should be successful.
            await ethers.provider.send("evm_setNextBlockTimestamp", [lastTimeDepositReward + 604801]);
            const tx = await ethPool.connect(teamMember).depositReward({ value: amount });

            await expect(tx).to.changeEtherBalance(teamMember.address, amount.mul(-1));
            await expect(tx).to.changeEtherBalance(ethPool.address, amount);
        });
    });

    describe('withdraw: CASE 1', async () => {
        it('A and B deposits, then T deposits rewards, then A and B widthdraw 150 and 450, respectively', async () => {
            const userA_amount = ethers.utils.parseEther('100');
            const userB_amount = ethers.utils.parseEther('300');
            const teamMember_amount = ethers.utils.parseEther('200');

            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(userB).deposit({ value: userB_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });

            const userA_tx = ethPool.connect(userA).withdraw();

            await expect(userA_tx).to.changeEtherBalance(userA.address, ethers.utils.parseEther('150'));
            await expect(userA_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('150').mul(-1));

            await expect(userA_tx).to.emit(ethPool, 'Withdraw').withArgs(userA.address, ethers.utils.parseEther('150'));

            await expect(await ethPool.amountToWithdraw(userA.address)).to.be.equal(0);

            const userB_tx = ethPool.connect(userB).withdraw();

            await expect(userB_tx).to.changeEtherBalance(userB.address, ethers.utils.parseEther('450'));
            await expect(userB_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('450').mul(-1));

            await expect(userB_tx).to.emit(ethPool, 'Withdraw').withArgs(userB.address, ethers.utils.parseEther('450'));

            await expect(await ethPool.amountToWithdraw(userB.address)).to.be.equal(0);
        });

        it('After A and B widthdraw, the two accounts should not be able to withdraw again', async () => {
            const userA_amount = ethers.utils.parseEther('100');
            const userB_amount = ethers.utils.parseEther('300');
            const teamMember_amount = ethers.utils.parseEther('200');

            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(userB).deposit({ value: userB_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });

            // User A withdraws
            await ethPool.connect(userA).withdraw();
            await expect(await ethPool.amountToWithdraw(userA.address)).to.be.equal(0);
            
            const userA_tx = ethPool.connect(userA).withdraw();
            await expect(userA_tx).to.be.revertedWith('You have nothing to withdraw');
            
            // User B withdraws
            await ethPool.connect(userB).withdraw();
            await expect(await ethPool.amountToWithdraw(userB.address)).to.be.equal(0);

            const userB_tx = ethPool.connect(userB).withdraw();
            await expect(userB_tx).to.be.revertedWith('You have nothing to withdraw');
        });
    });

    describe('withdraw: CASE 2', async () => {
        it('A deposits, then T deposits rewards, then B deposits, then A and B widthdraw 300 and 300, respectively', async () => {
            const userA_amount = ethers.utils.parseEther('100');
            const userB_amount = ethers.utils.parseEther('300');
            const teamMember_amount = ethers.utils.parseEther('200');

            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });

            await ethPool.connect(userB).deposit({ value: userB_amount });

            const userA_tx = ethPool.connect(userA).withdraw();

            await expect(userA_tx).to.changeEtherBalance(userA.address, ethers.utils.parseEther('300'));
            await expect(userA_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('300').mul(-1));

            await expect(userA_tx).to.emit(ethPool, 'Withdraw').withArgs(userA.address, ethers.utils.parseEther('300'));

            const userB_tx = ethPool.connect(userB).withdraw();

            await expect(userB_tx).to.changeEtherBalance(userB.address, ethers.utils.parseEther('300'));
            await expect(userB_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('300').mul(-1));

            await expect(userB_tx).to.emit(ethPool, 'Withdraw').withArgs(userB.address, ethers.utils.parseEther('300'));
        });

        it('After A and B widthdraw, the two accounts should not be able to withdraw again', async () => {
            const userA_amount = ethers.utils.parseEther('100');
            const userB_amount = ethers.utils.parseEther('300');
            const teamMember_amount = ethers.utils.parseEther('200');

            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });

            await ethPool.connect(userB).deposit({ value: userB_amount });

            // User A withdraws
            await ethPool.connect(userA).withdraw();
            await expect(await ethPool.amountToWithdraw(userA.address)).to.be.equal(0);
            
            const userA_tx = ethPool.connect(userA).withdraw();
            await expect(userA_tx).to.be.revertedWith('You have nothing to withdraw');
            
            // User B withdraws
            await ethPool.connect(userB).withdraw();
            await expect(await ethPool.amountToWithdraw(userB.address)).to.be.equal(0);

            const userB_tx = ethPool.connect(userB).withdraw();
            await expect(userB_tx).to.be.revertedWith('You have nothing to withdraw');
        });
    });

    describe('withdraw: CASE 3', async () => {
        it('A deposits, then T deposits, then A and B deposits, then T deposits and then A and B widthdraw 450 and 450, respectively', async () => {
            const userA_amount = ethers.utils.parseEther('100');
            const userB_amount = ethers.utils.parseEther('300');
            const teamMember_amount = ethers.utils.parseEther('200');

            await ethPool.connect(userA).deposit({ value: userA_amount });

            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });
            
            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(userB).deposit({ value: userB_amount });

            const lastTimeDepositReward = (await ethPool.lastTimeDepositReward()).toNumber();
            await ethers.provider.send("evm_setNextBlockTimestamp", [lastTimeDepositReward + 604801]);
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });

            const userA_tx = ethPool.connect(userA).withdraw();

            await expect(userA_tx).to.changeEtherBalance(userA.address, ethers.utils.parseEther('450'));
            await expect(userA_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('450').mul(-1));

            await expect(userA_tx).to.emit(ethPool, 'Withdraw').withArgs(userA.address, ethers.utils.parseEther('450'));

            const userB_tx = ethPool.connect(userB).withdraw();

            await expect(userB_tx).to.changeEtherBalance(userB.address, ethers.utils.parseEther('450'));
            await expect(userB_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('450').mul(-1));

            await expect(userB_tx).to.emit(ethPool, 'Withdraw').withArgs(userB.address, ethers.utils.parseEther('450'));
        });

        it('After A and B widthdraw, the two accounts should not be able to withdraw again', async () => {
            const userA_amount = ethers.utils.parseEther('100');
            const userB_amount = ethers.utils.parseEther('300');
            const teamMember_amount = ethers.utils.parseEther('200');

            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });

            await ethPool.connect(userB).deposit({ value: userB_amount });

            // User A withdraws
            await ethPool.connect(userA).withdraw();
            await expect(await ethPool.amountToWithdraw(userA.address)).to.be.equal(0);
            
            const userA_tx = ethPool.connect(userA).withdraw();
            await expect(userA_tx).to.be.revertedWith('You have nothing to withdraw');
            
            // User B withdraws
            await ethPool.connect(userB).withdraw();
            await expect(await ethPool.amountToWithdraw(userB.address)).to.be.equal(0);

            const userB_tx = ethPool.connect(userB).withdraw();
            await expect(userB_tx).to.be.revertedWith('You have nothing to withdraw');
        });
    });

    describe('grantRole', async () => {
        it('Admin should add a new team member', async () => {
            const tx = await ethPool.connect(admin).grantRole(ethPool.TEAM_MEMBER_ROLE(), newTeamMember.address);

            const isTeamMember = await ethPool.hasRole(ethPool.TEAM_MEMBER_ROLE(), newTeamMember.address);

            expect(isTeamMember).to.be.true;

            expect(tx)
                .to.emit(ethPool, 'RoleGranted')
                .withArgs(await ethPool.TEAM_MEMBER_ROLE(), newTeamMember.address, admin.address);
        });
    });
});
