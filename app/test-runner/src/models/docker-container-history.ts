import mongoose, { Document, Schema } from 'mongoose';

import { IDockerImage } from './docker-image';
import Status from './enums/status';

export interface IDockerContainerHistory extends Document {
  _id: Schema.Types.ObjectId;
  dockerImage: IDockerImage;
  containerName?: string;
  commandExecuted: string;
  status: Status;
  statusCode?: number;
  executionTimeSeconds?: number;
  output?: Record<string, any>;
}

const DockerContainerHistorySchema = new Schema<IDockerContainerHistory>(
  {
    dockerImage: { type: Schema.Types.ObjectId, ref: 'DockerImage', required: true },
    containerName: { type: String },
    commandExecuted: { type: String, required: true },
    status: { type: String, enum: Object.values(Status), required: true, default: Status.ERROR },
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
