import mongoose, { Schema } from 'mongoose';

import Status from '@models/enums/status';

export interface ITestExecutionResults {
  status: Status;
  reason: string;
  logs?: string;
  gas?: number;
}

export interface IGasDiffAnalysis {
  overallGasDiff: number;
  overallGasDiffPercentage: number;
  testGasDiffs: { test: string; gasDiff: number; gasDiffPercentage: number; }[];
}

export interface IDockerContainerExecutionOutput {
  data?: string;
  error?: string;
  overall?: { passed: boolean; numPassed: number; numFailed: number; totalGas: number };
  tests?: string[] | { [contract: string]: { [test: string]: ITestExecutionResults } };
  gasDiffAnalysis?: IGasDiffAnalysis
}

const GasDiffAnalysisSchema = new Schema<IGasDiffAnalysis>(
  {
    overallGasDiff: { type: Number },
    overallGasDiffPercentage: { type: Number },
    testGasDiffs: [{
      test: { type: String, required: true },
      gasDiff: { type: Number },
      gasDiffPercentage: { type: Number }
    }]
  },
  {
    _id: false // Prevent Mongoose from adding an _id field to embedded documents
  }
);

// DockerContainerExecutionOutputSchema
export default new Schema<IDockerContainerExecutionOutput>(
  {
    data: { type: String },
    error: { type: String },
    overall: {
      passed: { type: Boolean },
      numPassed: { type: Number },
      numFailed: { type: Number },
      totalGas: { type: Number }
    },
    tests: { type: mongoose.Schema.Types.Mixed }, // To allow for different data structures
    gasDiffAnalysis: { type: GasDiffAnalysisSchema }
  },
  {
    _id: false // Prevent Mongoose from adding an _id field to embedded documents
  }
);
