import mongoose from 'mongoose';

import DockerExitCode from '@models/enums/DockerExitCode';
import TestOutputSchema from '@models/schemas/ForgeTestOutputSchema';
import type { ITestOutput } from '@models/schemas/ForgeTestOutputSchema';

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
    output: { type: TestOutputSchema, required: true }
  },
  {
    _id: false
  }
);
