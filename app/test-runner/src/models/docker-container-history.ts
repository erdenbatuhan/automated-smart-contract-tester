import mongoose from 'mongoose';

import type { IDockerImage } from '@models/docker-image';

import DockerContainerResults from '@models/schemas/docker-container-results';
import type { IDockerContainerResults } from '@models/schemas/docker-container-results';

import Status from '@models/enums/status';
import ContainerPurpose from '@models/enums/container-purpose';

export interface IDockerContainerHistory extends mongoose.Document {
  _id: mongoose.Schema.Types.ObjectId;
  dockerImage: IDockerImage;
  status: Status;
  purpose: ContainerPurpose;
  container?: IDockerContainerResults;
}

const DockerContainerHistorySchema = new mongoose.Schema<IDockerContainerHistory>(
  {
    dockerImage: { type: mongoose.Schema.Types.ObjectId, ref: 'DockerImage', required: true },
    status: { type: String, enum: Status, required: true, default: Status.ERROR },
    purpose: { type: Number, enum: ContainerPurpose, required: true, default: ContainerPurpose.PROJECT_CREATION },
    container: { type: DockerContainerResults }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

export default mongoose.model<IDockerContainerHistory>('DockerContainerHistory', DockerContainerHistorySchema);
