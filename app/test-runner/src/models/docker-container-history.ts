import mongoose from 'mongoose';

import type { IDockerImage } from '@models/docker-image';
import Status from '@models/enums/status';
import ContainerPurpose from '@models/enums/container-purpose';

import TestOutput from '@models/schemas/forge-test-output';
import type { ITestOutput } from '@models/schemas/forge-test-output';

export interface IDockerContainerHistory extends mongoose.Document {
  _id: mongoose.Schema.Types.ObjectId;
  dockerImage: IDockerImage;
  containerName?: string;
  commandExecuted: string;
  status: Status;
  purpose: ContainerPurpose;
  statusCode?: number;
  executionTimeSeconds?: number;
  output?: ITestOutput;
}

const DockerContainerHistorySchema = new mongoose.Schema<IDockerContainerHistory>(
  {
    dockerImage: { type: mongoose.Schema.Types.ObjectId, ref: 'DockerImage', required: true },
    containerName: { type: String },
    commandExecuted: { type: String, required: true },
    status: { type: String, enum: Status, required: true, default: Status.ERROR },
    purpose: { type: Number, enum: ContainerPurpose, required: true, default: ContainerPurpose.PROJECT_CREATION },
    statusCode: { type: Number },
    executionTimeSeconds: { type: Number },
    output: { type: TestOutput }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

export default mongoose.model<IDockerContainerHistory>('DockerContainerHistory', DockerContainerHistorySchema);
