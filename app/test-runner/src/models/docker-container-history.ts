import mongoose, { CallbackWithoutResultAndOptionalError } from 'mongoose';

import type { IDockerImage } from '@models/docker-image';

import type { IDockerContainerResults } from '@models/schemas/docker-container-results';
import DockerContainerResults from '@models/schemas/docker-container-results';

import Status from '@models/enums/status';
import ContainerPurpose from '@models/enums/container-purpose';
import DockerExitCode from '@models/enums/docker-exit-code';

export interface IDockerContainerHistory extends mongoose.Document {
  _id: mongoose.Schema.Types.ObjectId;
  dockerImage: IDockerImage;
  status: Status;
  purpose: ContainerPurpose;
  container?: IDockerContainerResults;

  preSave(this: IDockerContainerHistory, next: CallbackWithoutResultAndOptionalError): Promise<void>;
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

DockerContainerHistorySchema.pre<IDockerContainerHistory>('save',
  /**
   * Pre-save middleware that runs before saving a document to set the container status based on the status code (Docker's exit code).
   *
   * @param {CallbackWithoutResultAndOptionalError} next - Callback function to continue the save operation.
   * @returns {Promise<void>} A promise that resolves when the middleware completes.
   */
  async function preSave(this: IDockerContainerHistory, next: CallbackWithoutResultAndOptionalError): Promise<void> {
    // Set the container status based on the status code; default to Status.ERROR if no status code is available
    if (this.container?.statusCode !== undefined) {
      if (this.container.statusCode === DockerExitCode.PURPOSELY_STOPPED) {
        this.status = Status.SUCCESS;
      } else if (this.container.statusCode === DockerExitCode.APPLICATION_ERROR) {
        this.status = Status.FAILURE;
      }
    }

    next();
  }
);

export default mongoose.model<IDockerContainerHistory>('DockerContainerHistory', DockerContainerHistorySchema);
