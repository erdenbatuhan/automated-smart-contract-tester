import mongoose, { Document, Schema } from 'mongoose';

import type { IDockerImage } from '@models/docker-image';
import Status from '@models/enums/status';

export interface TestExecutionResults {
  status: Status;
  reason: string;
  logs?: string;
  gas?: number;
}

export interface GasDiffAnalysis {
  overallGasDiff: number;
  overallGasDiffPercentage: number;
  testGasDiffs: { test: string; gasDiff: number; gasDiffPercentage: number; }[];
}

export interface DockerContainerExecutionOutput {
  data?: string;
  error?: string;
  overall?: { passed: boolean; numPassed: number; numFailed: number; };
  tests?: string[] | { [contract: string]: { [test: string]: TestExecutionResults } };
  gasDiffAnalysis?: GasDiffAnalysis
}

export interface IDockerContainerHistory extends Document {
  _id: Schema.Types.ObjectId;
  dockerImage: IDockerImage;
  containerName?: string;
  commandExecuted: string;
  status: Status;
  statusCode?: number;
  executionTimeSeconds?: number;
  output?: DockerContainerExecutionOutput;
}

const DockerContainerHistorySchema = new Schema<IDockerContainerHistory>(
  {
    dockerImage: { type: Schema.Types.ObjectId, ref: 'DockerImage', required: true },
    containerName: { type: String },
    commandExecuted: { type: String, required: true },
    status: { type: String, enum: Status, required: true, default: Status.ERROR },
    statusCode: { type: Number },
    executionTimeSeconds: { type: Number },
    output: { type: Object }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

export default mongoose.model<IDockerContainerHistory>('DockerContainerHistory', DockerContainerHistorySchema);
