import { expect } from 'chai';
import { ethers } from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';

import { ETHPool, ETHPool__factory } from '../build/types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';

const { getContractFactory, getSigners } = ethers;

describe('ETHPool', () => {
    let admin, teamMember, userA, userB: SignerWithAddress;
    let ethPool: ETHPool;
    let signers: SignerWithAddress[];

    beforeEach(async () => {
        [admin, teamMember, userA, userB] = await getSigners();

        const ethPoolFactory = (await getContractFactory('ETHPool', admin)) as ETHPool__factory;
        ethPool = await ethPoolFactory.deploy();
        await ethPool.deployed();
    });
        
    it('Deployed contract address should has a proper address', async () => {
        expect(ethPool.address).to.be.a.properAddress;
    });

    it('Contract should have balance of 0 ETH', async () => {
        const balance = await ethers.provider.getBalance(ethPool.address);
        expect(balance).to.be.equal(BigNumber.from(0));
    });

    it('Admin should has an ADMIN role', async () => {
        const isAdmin = await ethPool.hasRole(ethPool.ADMIN_ROLE(), admin.address);
        expect(isAdmin).to.be.true;
    });

    describe('deposit', async () => {
        it('should deposit ETH to the pool', async () => {
            const value = ethers.utils.parseEther('1');
            const tx = ethPool.connect(userA).deposit({ value });
            
            await expect(tx).to.changeEtherBalance(userA.address, value.mul(-1));
            await expect(tx).to.changeEtherBalance(ethPool.address, value);
        });
    });

    //     it('should deposit ETH to the pool', async () => {
    //       await simpleToken.transfer(signers[1].address, BigNumber.from('200'))
    //       const expectedBalance = BigNumber.from('200')
    //       expect(await simpleToken.balanceOf(signers[1].address)).to.eq(expectedBalance)
    //     })
    //   })
});
