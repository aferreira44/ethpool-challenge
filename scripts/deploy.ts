import '@nomiclabs/hardhat-ethers';
import { ethers } from 'hardhat';

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log('Deploying contracts with the account:', deployer.address);

    console.log('Account balance:', `${ethers.utils.formatEther(await deployer.getBalance())} ETH`);

    const ETHPool = await ethers.getContractFactory('ETHPool');
    const ethPool = await ETHPool.deploy();

    console.log('Deployed contract address:', ethPool.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
