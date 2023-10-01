import mongoose from 'mongoose';

import Constants from '@Constants';

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
  results?: object;
  deployer: IUser; // Virtual Field

  toLean(this: ISubmission): object;
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
    timestamps: true,
    optimisticConcurrency: true
  }
);

// Set a TTL for the submission (It will be deleted after X seconds if the test status is still INCONCLUSIVE)
SubmissionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: Constants.SUBMISSION_DOC_TTL, partialFilterExpression: { testStatus: TestStatus.INCONCLUSIVE } }
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
 * Converts the submission to a plain JavaScript object (POJO) while including virtuals and depopulating populated fields.
 *
 * @returns {object} A plain JavaScript object representing the document.
 */
SubmissionSchema.methods.toLean = function toLean(this: ISubmission): object {
  return this.toObject({ virtuals: true, depopulate: true });
};

SubmissionSchema.static('findByDeployer',
  /**
   * Find submissions by deployer.
   *
   * This static method searches for submissions associated with a specific deployer.
   *
   * @param {IUser} deployer - The deployer for whom to find submissions.
   * @returns {Promise<ISubmission[]>} A Promise that resolves to an array of submissions matching the criteria.
   */
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
      { $match: { 'upload.deployer': new mongoose.Types.ObjectId(String(deployer._id)) } },
      { $unwind: '$upload' }
    ]).exec()
      .then((submissionsAggregate) => {
        const uploadIds = submissionsAggregate.map(({ upload }) => upload._id);
        return this.find({ upload: { $in: uploadIds } }).populate(['project', 'upload']).exec();
      });
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
