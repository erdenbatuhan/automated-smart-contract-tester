import mongoose from 'mongoose';

import DockerExitCode from '@models/enums/docker-exit-code';
import TestOutput from '@models/schemas/forge-test-output';
import type { ITestOutput } from '@models/schemas/forge-test-output';

export interface IDockerContainerResults {
  containerName?: string | null;
  cmd: string;
  statusCode?: DockerExitCode;
  executionTimeSeconds?: number;
  output: ITestOutput;
}

// DockerContainerResultsSchema
export default new mongoose.Schema<IDockerContainerResults>(
  {
    containerName: { type: String },
    cmd: { type: String, required: true },
    statusCode: { type: Number, enum: DockerExitCode },
    executionTimeSeconds: { type: Number },
    output: { type: TestOutput, required: true }
  },
  { _id: false }
);
