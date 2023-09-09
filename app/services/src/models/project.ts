import mongoose, { Document, Schema } from 'mongoose';

import type { IUpload } from '@models/upload';

export interface TestExecutionArguments {
  gasLimit?: string; // The block gas limit
  codeSizeLimit?: string; // EIP-170: Contract code size limit in bytes. Useful to increase this because of tests. By default, it is 0x6000 (~25kb)
  chainId?: string; // The chain ID
  gasPrice?: string; // The gas price
  blockBaseFeePerGas?: string; // The base fee in a block
  txOrigin?: string; // The transaction origin
  blockCoinbase?: string; // The coinbase of the block
  blockTimestamp?: string; // The timestamp of the block
  blockNumber?: string; // The block number
  blockDifficulty?: string; // The block difficulty
  blockPrevRandao?: string; // The block prevrandao value
  blockGasLimit?: string; // The block gas limit
  memoryLimit?: string; // The memory limit of the EVM in bytes (32 MB by default)
  etherscanApiKey?: string; // The Etherscan (or equivalent) API key
}

export interface ITest {
  test: string;
  weight: number;
}

export interface IProject extends Document {
  _id: Schema.Types.ObjectId;
  projectName: string,
  upload: IUpload,
  tests: ITest[],
  testExecutionArguments: TestExecutionArguments
}

const TestSchema = new Schema<ITest>(
  {
    test: { type: String, required: true },
    weight: { type: Number, required: true }
  },
  {
    _id: false // Prevent Mongoose from adding an _id field to embedded documents
  }
);

const ProjectSchema = new Schema<IProject>(
  {
    projectName: { type: String, required: true, unique: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true },
    testExecutionArguments: { type: Object },
    tests: { type: [TestSchema], required: true }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

export default mongoose.model<IProject>('Project', ProjectSchema);
