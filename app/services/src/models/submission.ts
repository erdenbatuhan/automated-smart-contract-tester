import mongoose, { Document, Schema } from 'mongoose';
import type { SaveOptions } from 'mongoose';

import type { IProject } from '@models/project';
import type { IUpload } from '@models/upload';
import type { IUser } from '@models/user';
import TestStatus from '@models/enums/test-status';

export interface ISubmission extends Document {
  _id: Schema.Types.ObjectId;
  project: IProject;
  upload: IUpload;
  status: TestStatus;
  results: object;
  deployer: IUser; // Virtual Field

  leanSave(this: ISubmission, options?: SaveOptions): Promise<ISubmission>;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, select: false },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true, select: false },
    status: { type: String, enum: TestStatus, required: true, default: TestStatus.INCONCLUSIVE },
    results: { type: Object }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

// Virtual Field: deployer
SubmissionSchema.virtual('deployer', {
  ref: 'Upload',
  localField: 'upload',
  foreignField: '_id',
  justOne: true, // One-to-one Relationship
  get() { return this.upload.deployer; }
});

/**
 * Save the document and return it as a lean object with virtuals and depopulated references.
 *
 * @param {SaveOptions} [options] - Optional options to pass to the save operation.
 * @returns {Promise<ISubmission>} A promise that resolves to the saved document as a lean object.
 */
SubmissionSchema.methods.leanSave = async function leanSave(this: ISubmission, options?: SaveOptions): Promise<ISubmission> {
  return this.save(options).then((savedDoc) => savedDoc.toObject({ virtuals: true, depopulate: true, useProjection: true }));
};

// Submission
export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
