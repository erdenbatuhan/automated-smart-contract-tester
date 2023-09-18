import mongoose from 'mongoose';
import type { SaveOptions } from 'mongoose';

import type { IProject } from '@models/Project';
import Upload from '@models/Upload';
import type { IUpload } from '@models/Upload';
import type { IUser } from '@models/User';
import TestStatus from '@models/enums/TestStatus';

export interface ISubmission extends mongoose.Document {
  _id: mongoose.Schema.Types.ObjectId;
  project: IProject;
  upload: IUpload;
  testStatus: TestStatus;
  results: object;
  deployer: IUser; // Virtual Field

  leanSave(this: ISubmission, options?: SaveOptions): Promise<ISubmission>;
}

interface SubmissionModel extends mongoose.Model<ISubmission> {
  findByDeployer(deployer: IUser): Promise<ISubmission[]>;
  existsByIdAndDeployer(submissionId: string, deployer: IUser): Promise<boolean>;
}

const SubmissionSchema = new mongoose.Schema<ISubmission, SubmissionModel>(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, select: false },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true, select: false },
    testStatus: { type: String, enum: TestStatus, required: true, default: TestStatus.INCONCLUSIVE },
    results: { type: Object }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

// Virtual Field: deployer
SubmissionSchema.virtual<ISubmission>('deployer', {
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

SubmissionSchema.static('findByDeployer',
  async function findByDeployer(deployer: IUser): Promise<ISubmission[]> {
    return this.aggregate([
      {
        $lookup: {
          from: Upload.collection.name,
          localField: 'upload',
          foreignField: '_id',
          as: 'upload'
        }
      },
      { $match: { 'upload.deployer': new mongoose.Types.ObjectId(String(deployer._id)) } }
    ]);
  }
);

SubmissionSchema.static('existsByIdAndDeployer',
  /**
   * Checks if a submission with the specified ID was uploaded by the given deployer.
   *
   * @param {string} submissionId - The ID of the submission to check.
   * @param {IUser} deployer - The deployer to check against.
   * @returns {Promise<boolean>} A promise that resolves to true if the submission was uploaded by the deployer, otherwise false.
   */
  async function existsByIdAndDeployer(submissionId: string, deployer: IUser): Promise<boolean> {
    return this.findById(submissionId, 'upload')
      .populate('upload').exec()
      .then((submissionFound) => !!submissionFound && String(submissionFound.deployer) === String(deployer._id));
  }
);

// Submission
export default mongoose.model<ISubmission, SubmissionModel>('Submission', SubmissionSchema);
