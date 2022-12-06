import { expect } from 'chai';
import { ethers } from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';

import { ETHPool, ETHPool__factory } from '../build/types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';

const { getContractFactory, getSigners } = ethers;

describe('ETHPool LOAD TEST', () => {
    let ethPool: ETHPool;
    let signers: SignerWithAddress[];

    let admin, teamMember, userA, userB: SignerWithAddress;

    beforeEach(async () => {
        [admin, teamMember, userA, userB] = await getSigners();

        const ethPoolFactory = (await getContractFactory('ETHPool', admin)) as ETHPool__factory;
        ethPool = await ethPoolFactory.deploy();
        await ethPool.deployed();

        await ethPool.grantRole(ethPool.TEAM_MEMBER_ROLE(), teamMember.address);
    });

    it('LOAD TEST 1x: A deposits, then T deposits rewards, then B deposits, then T deposits rewards, then A and B widthdraw', async () => {
        const userA_amount = ethers.utils.parseEther('0.001');
        const userB_amount = ethers.utils.parseEther('0.003');
        const teamMember_amount = ethers.utils.parseEther('0.002');
    
        for (let i = 0; i < 1; i++) {
            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });
    
            await ethPool.connect(userB).deposit({ value: userB_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });
        }
        
        const userA_tx = ethPool.connect(userA).withdraw();
    
        await expect(userA_tx).to.changeEtherBalance(userA.address, ethers.utils.parseEther('0.003'));
        await expect(userA_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('0.003').mul(-1));
    
        await expect(userA_tx).to.emit(ethPool, 'Withdraw').withArgs(userA.address, ethers.utils.parseEther('0.003'));
    
        const userB_tx = ethPool.connect(userB).withdraw();
    
        await expect(userB_tx).to.changeEtherBalance(userB.address, ethers.utils.parseEther('0.005'));
        await expect(userB_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('0.005').mul(-1));
    
        await expect(userB_tx).to.emit(ethPool, 'Withdraw').withArgs(userB.address, ethers.utils.parseEther('0.005'));
    });

    it('LOAD TEST 2x: A deposits, then T deposits rewards, then B deposits, then A and B widthdraw', async () => {
        const userA_amount = ethers.utils.parseEther('0.001');
        const userB_amount = ethers.utils.parseEther('0.003');
        const teamMember_amount = ethers.utils.parseEther('0.002');
    
        for (let i = 0; i < 2; i++) {
            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });
    
            await ethPool.connect(userB).deposit({ value: userB_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });

        }
        
        const userA_tx = ethPool.connect(userA).withdraw();
    
        await expect(userA_tx).to.changeEtherBalance(userA.address, ethers.utils.parseEther('0.006'));
        await expect(userA_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('0.006').mul(-1));
    
        await expect(userA_tx).to.emit(ethPool, 'Withdraw').withArgs(userA.address, ethers.utils.parseEther('0.006'));
    
        const userB_tx = ethPool.connect(userB).withdraw();
    
        await expect(userB_tx).to.changeEtherBalance(userB.address, ethers.utils.parseEther('0.01'));
        await expect(userB_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('0.01').mul(-1));
    
        await expect(userB_tx).to.emit(ethPool, 'Withdraw').withArgs(userB.address, ethers.utils.parseEther('0.01'));
    });

    it('LOAD TEST 10x: A deposits, then T deposits rewards, then B deposits, then T deposits rewards, then A and B widthdraw', async () => {
        const userA_amount = ethers.utils.parseEther('0.001');
        const userB_amount = ethers.utils.parseEther('0.003');
        const teamMember_amount = ethers.utils.parseEther('0.002');
    
        for (let i = 0; i < 10; i++) {
            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });
    
            await ethPool.connect(userB).deposit({ value: userB_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });
        }
        
        const userA_tx = ethPool.connect(userA).withdraw();
    
        await expect(userA_tx).to.changeEtherBalance(userA.address, ethers.utils.parseEther('0.03'));
        await expect(userA_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('0.03').mul(-1));
    
        await expect(userA_tx).to.emit(ethPool, 'Withdraw').withArgs(userA.address, ethers.utils.parseEther('0.03'));
    
        const userB_tx = ethPool.connect(userB).withdraw();
    
        await expect(userB_tx).to.changeEtherBalance(userB.address, ethers.utils.parseEther('0.05'));
        await expect(userB_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('0.05').mul(-1));
    
        await expect(userB_tx).to.emit(ethPool, 'Withdraw').withArgs(userB.address, ethers.utils.parseEther('0.05'));
    });

    xit('LOAD TEST 1000x: A deposits, then T deposits rewards, then B deposits, then T deposits rewards, then A and B widthdraw', async () => {
        const userA_amount = ethers.utils.parseEther('0.001');
        const userB_amount = ethers.utils.parseEther('0.003');
        const teamMember_amount = ethers.utils.parseEther('0.002');
    
        for (let i = 0; i < 1000; i++) {
            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });
    
            await ethPool.connect(userB).deposit({ value: userB_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });
        }
        
        const userA_tx = ethPool.connect(userA).withdraw();
    
        await expect(userA_tx).to.changeEtherBalance(userA.address, ethers.utils.parseEther('3'));
        await expect(userA_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('3').mul(-1));
    
        await expect(userA_tx).to.emit(ethPool, 'Withdraw').withArgs(userA.address, ethers.utils.parseEther('3'));
    
        const userB_tx = ethPool.connect(userB).withdraw();
    
        await expect(userB_tx).to.changeEtherBalance(userB.address, ethers.utils.parseEther('5'));
        await expect(userB_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('5').mul(-1));
    
        await expect(userB_tx).to.emit(ethPool, 'Withdraw').withArgs(userB.address, ethers.utils.parseEther('5'));
    });

    xit('LOAD TEST 10000x: A deposits, then T deposits rewards, then B deposits, then T deposits rewards, then A and B widthdraw', async () => {
        const userA_amount = ethers.utils.parseEther('0.001');
        const userB_amount = ethers.utils.parseEther('0.003');
        const teamMember_amount = ethers.utils.parseEther('0.002');
    
        for (let i = 0; i < 10000; i++) {
            await ethPool.connect(userA).deposit({ value: userA_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });
    
            await ethPool.connect(userB).deposit({ value: userB_amount });
            await ethPool.connect(teamMember).depositReward({ value: teamMember_amount });
        }
        
        const userA_tx = ethPool.connect(userA).withdraw();
    
        await expect(userA_tx).to.changeEtherBalance(userA.address, ethers.utils.parseEther('30'));
        await expect(userA_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('30').mul(-1));
    
        await expect(userA_tx).to.emit(ethPool, 'Withdraw').withArgs(userA.address, ethers.utils.parseEther('30'));
    
        const userB_tx = ethPool.connect(userB).withdraw();
    
        await expect(userB_tx).to.changeEtherBalance(userB.address, ethers.utils.parseEther('50'));
        await expect(userB_tx).to.changeEtherBalance(ethPool.address, ethers.utils.parseEther('50').mul(-1));
    
        await expect(userB_tx).to.emit(ethPool, 'Withdraw').withArgs(userB.address, ethers.utils.parseEther('50'));
    });

});


