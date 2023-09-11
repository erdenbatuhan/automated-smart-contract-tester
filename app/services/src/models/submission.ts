import mongoose, { Document, Schema } from 'mongoose';
import type { SaveOptions } from 'mongoose';

import type { IProject } from '@models/project';
import type { IUpload } from '@models/upload';
import TestStatus from '@models/enums/test-status';

export interface ISubmission extends Document {
  _id: Schema.Types.ObjectId;
  project: IProject;
  upload: IUpload;
  status: TestStatus;
  results: object;

  leanSave(this: ISubmission, options?: SaveOptions): Promise<ISubmission>;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true },
    status: { type: String, enum: TestStatus, required: true, default: TestStatus.INCONCLUSIVE },
    results: { type: Object }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

/**
 * Save the document and return it as a lean object with depopulated references.
 *
 * @param {SaveOptions} [options] - Optional options to pass to the save operation.
 * @returns {Promise<ISubmission>} A promise that resolves to the saved document as a lean object with depopulated references.
 */
SubmissionSchema.methods.leanSave = async function leanSave(this: ISubmission, options?: SaveOptions): Promise<ISubmission> {
  return this.save(options).then((savedDoc) => savedDoc.toObject({ depopulate: true }));
};

// Submission
export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
