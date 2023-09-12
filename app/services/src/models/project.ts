import mongoose, { Document, Schema, SaveOptions } from 'mongoose';

import type { IUpload } from '@models/upload';
import type { IUser } from '@models/user';

// TestExecutionArgumentsSchema
import TestExecutionArgumentsSchema from '@models/schemas/test-execution-arguments';
import type { ITestExecutionArguments } from '@models/schemas/test-execution-arguments';

// TestSchema
import TestSchema from '@models/schemas/test';
import type { ITest } from '@models/schemas/test';

export interface IProject extends Document {
  _id: Schema.Types.ObjectId;
  projectName: string;
  upload: IUpload;
  testExecutionArguments?: ITestExecutionArguments;
  tests: ITest[];
  deployer: IUser; // Virtual Field

  leanSave(this: IProject, options?: SaveOptions): Promise<IProject>;
}

const ProjectSchema = new Schema<IProject>(
  {
    projectName: { type: String, unique: true, required: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true, select: false },
    testExecutionArguments: { type: TestExecutionArgumentsSchema },
    tests: { type: [TestSchema], required: true }
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
