import mongoose from 'mongoose';

import type ForgeTestOutput from '@forge/types/forge-test-output';
import type { ForgeOverallTestResults, ForgeTestResult } from '@forge/types/forge-test-output';
import ForgeTestStatus from '@forge/types/enums/forge-test-status';

const ForgeOverallTestResultsSchema = new mongoose.Schema<ForgeOverallTestResults>(
  {
    numContracts: { type: Number, required: true },
    numTests: { type: Number, required: true },
    passed: { type: Boolean },
    numPassed: { type: Number },
    numFailed: { type: Number },
    totalGas: { type: Number },
    totalGasChange: { type: Number },
    totalGasChangePercentage: { type: Number }
  },
  {
    _id: false
  }
);

const ForgeTestResultSchema = new mongoose.Schema<ForgeTestResult>(
  {
    contract: { type: String, required: true },
    test: { type: String, required: true },
    status: { type: String, enum: ForgeTestStatus },
    reason: { type: String },
    logs: { type: String },
    gas: { type: Number },
    gasChange: { type: Number },
    gasChangePercentage: { type: Number }
  },
  {
    _id: false
  }
);

export interface ITestOutput extends ForgeTestOutput {
  data?: string;
  error?: string;
}

// TestOutputSchema
export default new mongoose.Schema<ITestOutput>(
  {
    data: { type: String },
    error: { type: String },
    overall: { type: ForgeOverallTestResultsSchema },
    tests: { type: [ForgeTestResultSchema] }
  },
  {
    _id: false
  }
);
