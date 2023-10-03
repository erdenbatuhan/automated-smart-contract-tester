import mongoose from 'mongoose';
import type { SessionOption } from 'mongoose';

import Constants from '@Constants';

import Project from '@models/Project';
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
  findAllByProject(projectName: string, sessionOption?: SessionOption): Promise<ISubmission[]>
  findAllByProjectAndDeployer(projectName: string, deployer: IUser, sessionOption?: SessionOption): Promise<ISubmission[]>;
  existsByIdAndDeployer(submissionId: string, deployer: IUser, sessionOption?: SessionOption): Promise<boolean>;
}

const SubmissionSchema = new mongoose.Schema<ISubmission, SubmissionModel>(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true, required: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', index: true, required: true },
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

SubmissionSchema.static('findAllByProject',
  /**
   * Find all submissions associated with a specific project.
   *
   * This static method searches for all submissions associated with a project that matches the specified project name.
   *
   * @param {string} projectName - The name of the project for which to find submissions.
   * @param {SessionOption} [sessionOption] - Optional session option for MongoDB session management.
   * @returns {Promise<ISubmission[]>} A Promise that resolves to an array of submissions associated with the project.
   */
  async function findAllByProject(
    projectName: string, sessionOption?: SessionOption
  ): Promise<ISubmission[]> {
    return Project.findOne({ projectName }, null, sessionOption)
      .then((project) => {
        if (!project) return [];
        return this.find({ project: project._id }, null, sessionOption);
      });
  }
);

SubmissionSchema.static('findAllByProjectAndDeployer',
  /**
   * Find submissions by project name and deployer.
   *
   * This static method searches for submissions associated with a specific project name and deployer.
   *
   * @param {string} projectName - The name of the project for which to find submissions.
   * @param {IUser} deployer - The deployer for whom to find submissions.
   * @param {SessionOption} [sessionOption] - Optional session option for the query.
   * @returns {Promise<ISubmission[]>} A Promise that resolves to an array of submissions matching the criteria.
   */
  async function findAllByProjectAndDeployer(
    projectName: string, deployer: IUser, sessionOption?: SessionOption
  ): Promise<ISubmission[]> {
    return this.aggregate([
      {
        $lookup: { from: Project.collection.name, localField: 'project', foreignField: '_id', as: 'project' }
      },
      {
        $lookup: { from: Upload.collection.name, localField: 'upload', foreignField: '_id', as: 'upload' }
      },
      {
        $match: {
          'project.projectName': projectName,
          'upload.deployer': new mongoose.Types.ObjectId(String(deployer._id))
        }
      },
      {
        $group: {
          _id: null, // Group all documents into one group
          uploadIds: { $push: '$upload._id' } // Accumulate upload IDs into an array
        }
      },
      {
        $project: { _id: 0, uploadIds: 1 } // Include only the uploadIds field (Exclude even the _id field)
      }
    ], sessionOption).exec().then(([aggregate]) => (
      this.find({ upload: { $in: aggregate?.uploadIds } }).populate(['project', 'upload']).exec()
    ));
  }
);

SubmissionSchema.static('existsByIdAndDeployer',
  /**
   * Checks if a submission with the specified ID was uploaded by the given deployer.
   *
   * @param {string} submissionId - The ID of the submission to check.
   * @param {IUser} deployer - The deployer to check against.
   * @param {SessionOption} [sessionOption] - Optional session option for the query.
   * @returns {Promise<boolean>} A promise that resolves to true if the submission was uploaded by the deployer, otherwise false.
   */
  async function existsByIdAndDeployer(
    submissionId: string, deployer: IUser, sessionOption?: SessionOption
  ): Promise<boolean> {
    return this.findById(submissionId, 'upload', sessionOption)
      .populate('upload').exec()
      .then((submissionFound) => !!submissionFound && String(submissionFound.deployer) === String(deployer._id));
  }
);

// Submission
export default mongoose.model<ISubmission, SubmissionModel>('Submission', SubmissionSchema);
