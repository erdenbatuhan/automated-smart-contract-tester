import mongoose from 'mongoose';

import DockerExitCode from '@models/enums/docker-exit-code';
import TestOutput from '@models/schemas/forge-test-output';
import type { ITestOutput } from '@models/schemas/forge-test-output';

export interface IDockerContainerResults {
  containerName?: string | null;
  cmd: string;
  timeoutValue: number;
  executionTimeSeconds?: number;
  statusCode?: DockerExitCode;
  output: ITestOutput;
}

// DockerContainerResultsSchema
export default new mongoose.Schema<IDockerContainerResults>(
  {
    containerName: { type: String },
    cmd: { type: String, required: true },
    timeoutValue: { type: Number, required: true },
    executionTimeSeconds: { type: Number },
    statusCode: { type: Number, enum: DockerExitCode },
    output: { type: TestOutput, required: true }
  },
  {
    _id: false
  }
);
