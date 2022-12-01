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
    let signers: SignerWithAddress[];

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
        it('Any user should deposit ETH to the pool', async () => {
            const amount = ethers.utils.parseEther('1');
            const tx = ethPool.connect(userA).deposit({ value: amount });

            await expect(tx).to.changeEtherBalance(userA.address, amount.mul(-1));
            await expect(tx).to.changeEtherBalance(ethPool.address, amount);

            await expect(tx).to.emit(ethPool, 'Deposit').withArgs(userA.address, amount);
        });
    });

    describe('depositReward', async () => {
        it('Team member should deposit ETH as reward to the pool', async () => {
            const amount = ethers.utils.parseEther('1');
            const tx = ethPool.connect(teamMember).depositReward({ value: amount });

            await expect(tx).to.changeEtherBalance(teamMember.address, amount.mul(-1));
            await expect(tx).to.changeEtherBalance(ethPool.address, amount);

            await expect(tx)
                .to.emit(ethPool, 'DepositReward')
                .withArgs(teamMember.address, amount);
        });
    });

    describe('grantRole', async () => {
        it('Admin should add a new team member', async () => {
            const tx = await ethPool.connect(admin).grantRole(ethPool.TEAM_MEMBER_ROLE(), newTeamMember.address);
            
            const isTeamMember = await ethPool.hasRole(ethPool.TEAM_MEMBER_ROLE(), newTeamMember.address);

            await expect(isTeamMember).to.be.true;
            
            await expect(tx)
                .to.emit(ethPool, 'RoleGranted')
                .withArgs(await ethPool.TEAM_MEMBER_ROLE(), newTeamMember.address, admin.address);
        });
    });

    //     it('should deposit ETH to the pool', async () => {
    //       await simpleToken.transfer(signers[1].address, BigNumber.from('200'))
    //       const expectedBalance = BigNumber.from('200')
    //       expect(await simpleToken.balanceOf(signers[1].address)).to.eq(expectedBalance)
    //     })
    //   })
});
