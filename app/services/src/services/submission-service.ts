import mongoose from 'mongoose';
import type { ProjectionType, SessionOption } from 'mongoose';
import { HttpStatusCode } from 'axios';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import type { IUser } from '@models/user';
import Submission from '@models/submission';
import type { ISubmission } from '@models/submission';

import projectService from '@services/project-service';
import uploadService from '@services/upload-service';
import testRunnerExecutionApi from '@api/testrunner/execution-api';

import errorUtils from '@utils/error-utils';
import type { RequestFile } from '@utils/router-utils';
import executionOutputUtils from '@utils/execution-output-utils';

/**
 * Finds all submissions.
 *
 * @returns {Promise<ISubmission[]>} A promise that resolves to an array of all submissions.
 * @throws {AppError} If an error occurs during the operation.
 */
const findAllSubmissions = async (): Promise<ISubmission[]> => Submission.find().exec()
  .catch((err: Error | unknown) => {
    throw errorUtils.handleError(err, 'An error occurred while finding all submissions.');
  });

/**
 * Finds all submissions uploaded by a given user.
 *
 * @param {IUser} user - The user for whom to retrieve submissions.
 * @returns {Promise<ISubmission[]>} A promise that resolves to an array of submissions.
 * @throws {AppError} If an error occurs during the operation.
 */
const findAllSubmissionsByGivenUser = async (user: IUser): Promise<ISubmission[]> => Submission.findByDeployer(user)
  .catch((err: Error | unknown) => {
    throw errorUtils.handleError(err, 'An error occurred while finding all submissions uploaded by a given user.');
  });

/**
 * Finds a submission by its ID.
 *
 * @param {string} projectName - The name of the project for which the submission is run.
 * @param {string} submissionId - The ID of the submission to find.
 * @param {ProjectionType<ISubmission>} [projection] - Optional projection for the query.
 * @param {SessionOption} [sessionOption] - Optional session option for the query.
 * @returns {Promise<ISubmission>} A promise that resolves to the found submission.
 * @throws {AppError} If the submission is not found (HTTP 404) or if an error occurs during the operation.
 */
const findSubmissionById = (
  projectName: string, submissionId: string, projection?: ProjectionType<ISubmission>, sessionOption?: SessionOption
): Promise<ISubmission> => Submission.findById(submissionId, projection, sessionOption)
  .populate(['project', 'upload']).exec()
  .then((submission) => {
    if (!submission || submission.project.projectName !== projectName) {
      throw new AppError(HttpStatusCode.NotFound, `No submission with the ID '${submissionId}' found within the ${projectName} project.`);
    }

    return submission;
  })
  .catch((err: AppError | Error | unknown) => {
    throw errorUtils.handleError(err, `An error occurred while finding the submission with the ID '${submissionId}'.`);
  });

/**
 * Checks if a submission with the specified ID was uploaded by the given user.
 *
 * @param {IUser} user - The user to check against.
 * @param {string} submissionId - The ID of the submission to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the submission was uploaded by the user, otherwise false.
 * @throws {AppError} If an error occurs during the check.
 */
const isSubmissionUploadedByGivenUser = (
  user: IUser, submissionId: string
): Promise<boolean> => Submission.existsByIdAndDeployer(submissionId, user)
  .catch((err: Error | unknown) => {
    throw errorUtils.handleError(err, `An error occurred while checking if the submission with the ID '${submissionId}' was uploaded by the user with email '${user.email}'.`);
  });

/**
 * Run a submission for a specified project, including uploading submission files,
 * executing the Docker image, and saving the submission with status and results.
 *
 * @param {IUser} user - The user performing the upload.
 * @param {string} projectName - The name of the project for which the submission is run.
 * @param {RequestFile} requestFile - The file containing project data.
 * @returns {Promise<ISubmission>} A Promise that resolves to the saved submission document.
 * @throws {AppError} If an error occurs during any step of the submission process.
 */
const runAndCreateSubmission = async (
  user: IUser, projectName: string, requestFile: RequestFile
): Promise<ISubmission> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Logger.info(`Running a submission for the ${projectName} project.`);

    // Step 1: Find the project by name and create a new submission document
    const project = await projectService.findProjectByName(projectName, null, 'config', { session });
    const submission = new Submission({ project });

    // Step 2: Upload submission files and get the upload document saved
    submission.upload = await uploadService.uploadZipBuffer(
      user, `project_${projectName}_submission_${submission._id}`, requestFile.buffer, null, { session });

    // Step 3: Send the files to the test runner service to run the Docker image
    const testExecutionOutput = await testRunnerExecutionApi.executeSubmission(
      projectName, requestFile, project.config);

    // Step 4: Extract the status and calculate the score based on the execution output
    submission.testStatus = executionOutputUtils.extractTestStatus(testExecutionOutput);
    submission.results = executionOutputUtils.calculateTestScoreAndGenerateResults(testExecutionOutput);

    // Step 5: Save the submission
    const submissionSaved = await submission.leanSave({ session });

    // Commit transaction and return results
    return await session.commitTransaction().then(() => {
      Logger.info(`Successfully ran a submission (ID=${submission._id}) for the ${projectName} project.`);
      return submissionSaved;
    });
  } catch (err: AppError | Error | unknown) {
    // Abort the transaction
    await session.abortTransaction();

    // Handle any errors
    throw errorUtils.handleError(err, `An error occurred while running a submission for the ${projectName} project.`);
  } finally {
    await session.endSession();
  }
};

/**
 * Downloads the uploaded files associated with the submission.
 *
 * @param {string} projectName - The name of the project for which the submission is run.
 * @param {string} submissionId - The ID of the submission.
 * @returns {Promise<Buffer>} A promise that resolves to the downloaded zip buffer containing submission files.
 * @throws {AppError} If the submission does not exist (HTTP 404) or if there's an error during the download (HTTP 500).
 */
const downloadSubmissionFiles = (
  projectName: string, submissionId: string
): Promise<Buffer> => findSubmissionById(projectName, submissionId, 'upload')
  .then(({ upload }) => uploadService.downloadUploadedFiles(`submission ${submissionId}`, upload));

/**
 * Deletes a submission by its ID.
 *
 * @param {string} projectName - The name of the project for which the submission is run.
 * @param {string} submissionId - The ID of the submission to remove.
 * @param {SessionOption} [sessionOption] - Optional session to use for the deletion operation.
 * @returns {Promise<void>} A promise that resolves when the submission is successfully removed.
 * @throws {AppError} If the submission does not exist (HTTP 404) or if there's an error during the deletion process (HTTP 500).
 */
const deleteSubmissionById = async (projectName: string, submissionId: string, sessionOption?: SessionOption): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Logger.info(`Deleting the submission with the ID '${submissionId}'.`);

    // Step 1: Delete the upload associated with the submission
    await findSubmissionById(projectName, submissionId, 'upload', { session })
      .then(({ upload }) => uploadService.deleteUpload(upload, { session }));

    // Step 2: Delete the submission from the DB
    await Submission.findByIdAndDelete(submissionId, sessionOption).exec().then((submissionDeleted) => {
      if (!submissionDeleted) throw new Error();
    }).catch((err: AppError | Error | unknown) => {
      throw new AppError(HttpStatusCode.InternalServerError, `Failed to delete the submission (ID=${submissionId}).`, (err as Error)?.message); // Should not happen normally!
    });

    // Commit transaction
    await session.commitTransaction();
    Logger.info(`Successfully deleted the submission with the ID '${submissionId}'.`);
  } catch (err: AppError | Error | unknown) {
    // Abort the transaction
    await session.abortTransaction();

    // Handle any errors and throw an AppError with relevant status code and error message
    throw errorUtils.handleError(err, `An error occurred while deleting the submission with the ID '${submissionId}'.`);
  } finally {
    // End the session
    await session.endSession();
  }
};

export default {
  findAllSubmissions,
  findAllSubmissionsByGivenUser,
  findSubmissionById,
  isSubmissionUploadedByGivenUser,
  runAndCreateSubmission,
  downloadSubmissionFiles,
  deleteSubmissionById
};
