import mongoose from 'mongoose';
import type { ProjectionType, SessionOption } from 'mongoose';
import { HttpStatusCode } from 'axios';

import Logger from '@Logger';
import AppError from '@errors/AppError';

import type { IUser } from '@models/User';
import type { IProject } from '@models/Project';
import Submission from '@models/Submission';
import type { ISubmission } from '@models/Submission';
import type ContainerExecutionResponse from '@rabbitmq/test-runner/dto/responses/ContainerExecutionResponse';

import projectServices from '@services/projectServices';
import uploadServices from '@services/uploadServices';

import TestStatus from '@models/enums/TestStatus';

/**
 * Finds all submissions associated with a specific project.
 *
 * This function retrieves all submissions associated with the project
 * that matches the specified project name.
 *
 * @param {string} projectName - The name of the project for which to find submissions.
 * @param {SessionOption} [sessionOption] - Optional session option for the query.
 * @returns {Promise<ISubmission[]>} A promise that resolves to an array of submissions associated with the given project.
 * @throws {AppError} If an error occurs during the operation.
 */
const findAllSubmissions = async (
  projectName: string, sessionOption?: SessionOption
): Promise<ISubmission[]> => Submission.findAllByProject(projectName, sessionOption)
  .catch((err: Error | unknown) => {
    throw AppError.createAppError(err, 'An error occurred while finding all submissions.');
  });

/**
 * Finds all submissions uploaded by a given user for a specific project.
 *
 * This function retrieves all submissions associated with a project
 * that matches the specified project name and were uploaded by the specified user.
 *
 * @param {string} projectName - The name of the project for which to find submissions.
 * @param {IUser} user - The user for whom to retrieve submissions.
 * @param {SessionOption} [sessionOption] - Optional session option for the query.
 * @returns {Promise<ISubmission[]>} A promise that resolves to an array of submissions
 *                                   uploaded by the given user for the given project.
 * @throws {AppError} If an error occurs during the operation.
 */
const findAllSubmissionsByGivenUser = async (
  projectName: string, user: IUser, sessionOption?: SessionOption
): Promise<ISubmission[]> => Submission.findAllByProjectAndDeployer(projectName, user, sessionOption)
  .catch((err: Error | unknown) => {
    throw AppError.createAppError(err, 'An error occurred while finding all submissions uploaded by a given user.');
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
    if (!submission || (submission.project && submission.project!.projectName !== projectName)) {
      throw new AppError(HttpStatusCode.NotFound, `No submission with the ID '${submissionId}' found within the ${projectName} project.`);
    }

    return submission;
  })
  .catch((err: AppError | Error | unknown) => {
    throw AppError.createAppError(err, `An error occurred while finding the submission with the ID '${submissionId}'.`);
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
    throw AppError.createAppError(err, `An error occurred while checking if the submission with the ID '${submissionId}' was uploaded by the user with email '${user.email}'.`);
  });

/**
 * Create a submission for a specified project, including uploading submission files.
 *
 * @param {IUser} user - The user performing the upload.
 * @param {string} projectName - The name of the project for which the submission is run.
 * @param {Buffer} zipBuffer - The zip buffer containing project data.
 * @returns {Promise<{ submission: ISubmission; project: IProject; }>} A Promise that resolves to the saved submission document
 *                                                                     and the retrieved project the submission is related to.
 * @throws {AppError} If an error occurs during any step of the submission process.
 */
const createSubmission = async (
  user: IUser, projectName: string, zipBuffer: Buffer
): Promise<{ submission: ISubmission; project: IProject; }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    Logger.info(`Running a submission for the ${projectName} project.`);

    // Find the project by name and create a new submission document
    const project = await projectServices.findProjectByName(projectName, null, 'projectName config', { session });
    const submission = new Submission({ project });

    // Upload submission files and get the upload document saved
    submission.upload = await uploadServices.uploadZipBuffer(
      user, `project_${projectName}_submission_${submission._id}`, zipBuffer, null, { session });

    // Save the submission
    const submissionSaved = await submission.save({ session });

    // Commit transaction and return results
    return await session.commitTransaction().then(() => {
      Logger.info(`Successfully ran a submission (ID=${submission._id}) for the ${projectName} project.`);
      return { submission: submissionSaved, project };
    });
  } catch (err: AppError | Error | unknown) {
    // Abort the transaction
    await session.abortTransaction();

    // Handle any errors
    throw AppError.createAppError(err, `An error occurred while running a submission for the ${projectName} project.`);
  } finally {
    await session.endSession();
  }
};

/**
 * Updates a submission with the test execution output from the test runner service.
 *
 * @param {ISubmission} submission - The submission to be updated.
 * @param {ContainerExecutionResponse} testExecutionOutput - The test runner's test execution output.
 * @returns {Promise<ISubmission['_id']>} A Promise that resolves to the ID of the updated submission.
 * @throws {AppError} If an error occurs while updating the submission.
 */
const updateSubmissionWithTestRunnerOutput = async (
  submission: ISubmission, testExecutionOutput: ContainerExecutionResponse
): Promise<ISubmission['_id']> => {
  try {
    Logger.info(`Updating submission (${submission._id}) with test runner output.`);

    // Process the output and update the test status and results
    submission.testStatus = testExecutionOutput?.container?.output?.overall?.passed ? TestStatus.PASSED : TestStatus.FAILED;
    submission.results = testExecutionOutput?.container;

    // Update the submission
    const updatedSubmissionId = await submission.save().then(({ _id }) => _id);

    Logger.info(`Submission (${updatedSubmissionId}) updated successfully.`);
    return updatedSubmissionId;
  } catch (err: AppError | Error | unknown) {
    throw AppError.createAppError(err, `Error updating submission (${submission._id}) with test execution output: ${(err as Error).message}`);
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
  .then(({ upload }) => uploadServices.downloadUploadedFiles(`submission ${submissionId}`, upload));

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
      .then(({ upload }) => uploadServices.deleteUpload(upload, { session }));

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
    throw AppError.createAppError(err, `An error occurred while deleting the submission with the ID '${submissionId}'.`);
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
  createSubmission,
  updateSubmissionWithTestRunnerOutput,
  downloadSubmissionFiles,
  deleteSubmissionById
};
