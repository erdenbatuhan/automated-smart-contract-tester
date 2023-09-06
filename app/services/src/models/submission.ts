import mongoose, { Document, Schema } from 'mongoose';

import type { IProject } from './project';
import type { IUpload } from './upload';
import Status from './enums/status';

export interface ISubmission extends Document {
  _id: Schema.Types.ObjectId;
  project: IProject,
  upload: IUpload,
  status: Status,
  results: object
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true },
    status: { type: String, enum: Status, required: true, default: Status.FAILURE },
    results: { type: Object }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
