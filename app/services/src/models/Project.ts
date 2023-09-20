import mongoose from 'mongoose';

import Constants from '@Constants';

import type { IUpload } from '@models/Upload';
import type { IUser } from '@models/User';

import ProjectConfigSchema from '@models/schemas/ProjectConfigSchema';
import type { IProjectConfig } from '@models/schemas/ProjectConfigSchema';

export interface IProject extends mongoose.Document {
  _id: mongoose.Schema.Types.ObjectId;
  projectName: string;
  upload: IUpload;
  config: IProjectConfig;
  output?: object;
  deployer: IUser; // Virtual Field

  toLean(this: IProject): Promise<object>;
}

const ProjectSchema = new mongoose.Schema<IProject>(
  {
    projectName: { type: String, unique: true, required: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true, select: false },
    config: { type: ProjectConfigSchema, required: true },
    output: { type: Object }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

// Set a TTL for the project (It will be deleted after X seconds if the output is still null)
ProjectSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: Constants.PROJECT_DOC_TTL, partialFilterExpression: { output: null } }
);

// Virtual Field: deployer
ProjectSchema.virtual<IProject>('deployer', {
  ref: 'Upload',
  localField: 'upload',
  foreignField: '_id',
  justOne: true, // One-to-one Relationship
  get() { return this.upload.deployer; }
});

/**
 * Converts the submission to a plain JavaScript object (POJO) while including virtuals and depopulating populated fields.
 *
 * @returns {Promise<object>} A Promise that resolves to a plain JavaScript object representing the document.
 * @throws {Error} If an error occurs during the operation.
 */
ProjectSchema.methods.toLean = function toLean(this: IProject): Promise<object> {
  return this.toObject({ virtuals: true, depopulate: true });
};

// Project
export default mongoose.model<IProject>('Project', ProjectSchema);
