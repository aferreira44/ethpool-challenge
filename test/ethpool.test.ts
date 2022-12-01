import { expect } from 'chai';
import { ethers } from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import "@nomicfoundation/hardhat-chai-matchers";

import { ETHPool, ETHPool__factory } from '../build/types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
// import { BigNumber } from 'ethers'

const { getContractFactory, getSigners } = ethers;

describe('ETHPool', () => {
    let Admin, TeamMember: SignerWithAddress;
    let ethPool: ETHPool;
    let signers: SignerWithAddress[];

    beforeEach(async () => {
        [Admin] = await getSigners();

        const ethPoolFactory = (await getContractFactory('ETHPool', Admin)) as ETHPool__factory;
        ethPool = await ethPoolFactory.deploy();
        await ethPool.deployed();
        
    });

    it('Deployed contract should has a proper address', async () => {
        expect(ethPool.address).to.be.a.properAddress;
    });

    it('Admin should has an ADMIN role', async () => {
        const isAdmin = await ethPool.hasRole(ethPool.ADMIN_ROLE(), Admin.address);
        expect(isAdmin).to.be.true;
    });

    // 4
    //   describe('deposit', async () => {
    //     it('should deposit ETH to the pool', async () => {
    //       await simpleToken.transfer(signers[1].address, BigNumber.from('200'))
    //       const expectedBalance = BigNumber.from('200')
    //       expect(await simpleToken.balanceOf(signers[1].address)).to.eq(expectedBalance)
    //     })
    //   })
});
