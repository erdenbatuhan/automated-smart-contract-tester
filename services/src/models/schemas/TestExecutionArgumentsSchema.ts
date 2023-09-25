import mongoose from 'mongoose';

export const testExecutionArgumentDescriptions = {
  gasLimit: 'The block gas limit',
  codeSizeLimit: 'EIP-170: Contract code size limit in bytes. Useful to increase this because of tests. By default, it is 0x6000 (~25kb)',
  chainId: 'The chain ID',
  gasPrice: 'The gas price',
  blockBaseFeePerGas: 'The base fee in a block',
  txOrigin: 'The transaction origin',
  blockCoinbase: 'The coinbase of the block',
  blockTimestamp: 'The timestamp of the block',
  blockNumber: 'The block number',
  blockDifficulty: 'The block difficulty',
  blockPrevRandao: 'The block prevrandao value',
  blockGasLimit: 'The block gas limit',
  memoryLimit: 'The memory limit of the EVM in bytes (32 MB by default)',
  etherscanApiKey: 'The Etherscan (or equivalent) API key'
};

export interface ITestExecutionArguments {
  gasLimit?: string;
  codeSizeLimit?: string;
  chainId?: string;
  gasPrice?: string;
  blockBaseFeePerGas?: string;
  txOrigin?: string;
  blockCoinbase?: string;
  blockTimestamp?: string;
  blockNumber?: string;
  blockDifficulty?: string;
  blockPrevRandao?: string;
  blockGasLimit?: string;
  memoryLimit?: string;
  etherscanApiKey?: string;
}

// TestExecutionArgumentsSchema
export default new mongoose.Schema<ITestExecutionArguments>(
  {
    gasLimit: String,
    codeSizeLimit: String,
    chainId: String,
    gasPrice: String,
    blockBaseFeePerGas: String,
    txOrigin: String,
    blockCoinbase: String,
    blockTimestamp: String,
    blockNumber: String,
    blockDifficulty: String,
    blockPrevRandao: String,
    blockGasLimit: String,
    memoryLimit: String,
    etherscanApiKey: String
  },
  {
    _id: false
  }
);
