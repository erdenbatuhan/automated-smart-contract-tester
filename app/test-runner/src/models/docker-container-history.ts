import mongoose, { Document, Schema } from 'mongoose';

import type { IDockerImage } from '@models/docker-image';
import DockerContainerExecutionOutputSchema from '@models/schemas/docker-container-execution-output';
import type { IDockerContainerExecutionOutput } from '@models/schemas/docker-container-execution-output';
import Status from '@models/enums/status';

export interface IDockerContainerHistory extends Document {
  _id: Schema.Types.ObjectId;
  dockerImage: IDockerImage;
  containerName?: string;
  commandExecuted: string;
  status: Status;
  statusCode?: number;
  executionTimeSeconds?: number;
  output?: IDockerContainerExecutionOutput;
}

const DockerContainerHistorySchema = new Schema<IDockerContainerHistory>(
  {
    dockerImage: { type: Schema.Types.ObjectId, ref: 'DockerImage', required: true },
    containerName: { type: String },
    commandExecuted: { type: String, required: true },
    status: { type: String, enum: Status, required: true, default: Status.ERROR },
    statusCode: { type: Number },
    executionTimeSeconds: { type: Number },
    output: { type: DockerContainerExecutionOutputSchema }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

export default mongoose.model<IDockerContainerHistory>('DockerContainerHistory', DockerContainerHistorySchema);
