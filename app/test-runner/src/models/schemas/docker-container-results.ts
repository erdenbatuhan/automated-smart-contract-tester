import mongoose from 'mongoose';

import TestOutput from '@models/schemas/forge-test-output';
import type { ITestOutput } from '@models/schemas/forge-test-output';

export interface IDockerContainerResults {
  containerName?: string | null;
  cmd: string;
  statusCode?: number;
  executionTimeSeconds?: number;
  output: ITestOutput;
}

// DockerContainerResultsSchema
export default new mongoose.Schema<IDockerContainerResults>(
  {
    containerName: { type: String },
    cmd: { type: String, required: true },
    statusCode: { type: Number },
    executionTimeSeconds: { type: Number },
    output: { type: TestOutput, required: true }
  },
  { _id: false }
);
