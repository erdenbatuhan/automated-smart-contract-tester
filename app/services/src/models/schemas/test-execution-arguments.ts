import mongoose from 'mongoose';

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
