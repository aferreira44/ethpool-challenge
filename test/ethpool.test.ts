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
        it('Should transfer value properly from an address to the pool', async () => {
            const amount = ethers.utils.parseEther('1');
            const tx = ethPool.connect(userA).deposit({ value: amount });

            await expect(tx).to.changeEtherBalance(userA.address, amount.mul(-1));
            await expect(tx).to.changeEtherBalance(ethPool.address, amount);

            await expect(tx).to.emit(ethPool, 'Deposit').withArgs(userA.address, 1, amount);
        });

        it('Should store the amount deposited by each address', async () => {
            const userA_amount = ethers.utils.parseEther('100');
            const userB_amount = ethers.utils.parseEther('300');

            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(userB).deposit({ value: userB_amount });

            const currentWeek = (await ethPool.getCurrentWeek()).toNumber();

            const amountDeposited = {
                userA: await ethPool.depositedByAddress(currentWeek, userA.address),
                userB: await ethPool.depositedByAddress(currentWeek, userB.address),
            };

            expect(amountDeposited.userA).to.be.equal(userA_amount);
            expect(amountDeposited.userB).to.be.equal(userB_amount);

            // const totalDepositedExpected = userA_amount.add(userB_amount);
            // expect(await ethPool.totalDeposited(currentWeek)).to.be.equal(totalDepositedExpected);
        });
    });

    describe('depositReward', async () => {
        it('Team member should deposit ETH as reward to the pool', async () => {
            const amount = ethers.utils.parseEther('1');
            const tx = ethPool.connect(teamMember).depositReward({ value: amount });

            const currentWeek = (await ethPool.getCurrentWeek()).toNumber();

            await expect(tx).to.changeEtherBalance(teamMember.address, amount.mul(-1));
            await expect(tx).to.changeEtherBalance(ethPool.address, amount);

            expect(await ethPool.rewardsDeposited(currentWeek)).to.be.equal(amount);

            await expect(tx).to.emit(ethPool, 'DepositReward').withArgs(teamMember.address, currentWeek, amount);
        });
    });

    describe('withdraw', async () => {
        it('A and B deposits, then T deposits rewards, then A and B widthdraw', async () => {
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

            const userB_tx = ethPool.connect(userB).withdraw();

            await expect(userB_tx).to.changeEtherBalance(userB.address, ethers.utils.parseEther('450'));
            await expect(userB_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('450').mul(-1));

            await expect(userB_tx).to.emit(ethPool, 'Withdraw').withArgs(userB.address, ethers.utils.parseEther('450'));
        });

        it('A deposits, then T deposits rewards, then B deposits, then A and B widthdraw', async () => {
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

    // describe('deposit', async () => {
    //     it('should deposit ETH to the pool', async () => {
    //         const previousBalance = await ethers.provider.getBalance(ethPool.address);

    //         const value = ethers.utils.parseEther('1');
    //         const tx = ethPool.connect(userA).deposit({ value });

    //         await expect(tx).to.changeEtherBalance(userA.address, value.mul(-1));
    //         await expect(tx).to.changeEtherBalance(ethPool.address, value);

    //         const balance = await ethers.provider.getBalance(ethPool.address);
    //         expect(balance).to.be.equal(previousBalance.add(1));
    //     });
    // });
});
