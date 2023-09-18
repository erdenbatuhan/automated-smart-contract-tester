import mongoose from 'mongoose';
import type { SaveOptions } from 'mongoose';

import type { IUpload } from '@models/Upload';
import type { IUser } from '@models/User';

import ProjectConfigSchema from '@models/schemas/ProjectConfigSchema';
import type { IProjectConfig } from '@models/schemas/ProjectConfigSchema';

import ContainerExecutionResponse from '@api/services/testrunner/types/ContainerExecutionResponse';

export interface IProject extends mongoose.Document {
  _id: mongoose.Schema.Types.ObjectId;
  projectName: string;
  upload: IUpload;
  config: IProjectConfig;
  output: ContainerExecutionResponse;
  deployer: IUser; // Virtual Field

  leanSave(this: IProject, options?: SaveOptions): Promise<IProject>;
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

// Virtual Field: deployer
ProjectSchema.virtual<IProject>('deployer', {
  ref: 'Upload',
  localField: 'upload',
  foreignField: '_id',
  justOne: true, // One-to-one Relationship
  get() { return this.upload.deployer; }
});

/**
 * Save the document and return it as a lean object with virtuals and depopulated references.
 *
 * Ensure that you do not set "depopulate" to "false" in order to prevent populating the "upload" document in the project.
 *
 * @param {SaveOptions} [options] - Optional options to pass to the save operation.
 * @returns {Promise<IProject>} A promise that resolves to the saved document as a lean object.
 */
ProjectSchema.methods.leanSave = async function leanSave(this: IProject, options?: SaveOptions): Promise<IProject> {
  return this.save(options).then((savedDoc) => savedDoc.toObject({ virtuals: true, depopulate: true, useProjection: true }));
};

// Project
export default mongoose.model<IProject>('Project', ProjectSchema);
