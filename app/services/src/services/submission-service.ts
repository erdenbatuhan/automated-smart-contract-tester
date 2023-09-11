import type { ProjectionType, SessionOption } from 'mongoose';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import Submission from '@models/submission';
import type { ISubmission } from '@models/submission';

import uploadService from '@services/upload-service';

import errorUtils from '@utils/error-utils';
import type { RequestFile } from '@utils/router-utils';

/**
 * Find all submissions.
 *
 * @returns {Promise<ISubmission[]>} A promise that resolves to an array of all submissions.
 * @throws {AppError} If an error occurs during the operation.
 */
const findAllSubmissions = async (): Promise<ISubmission[]> => Submission.find().exec()
  .catch((err: Error | unknown) => {
    throw errorUtils.logAndGetError(
      new AppError(500, 'An error occurred while finding all submissions.', (err as Error)?.message));
  });

/**
 * Find a submission by its ID.
 *
 * @param {string} submissionId - The ID of the submission to find.
 * @param {ProjectionType<ISubmission>} projection - Optional projection for query.
 * @param {SessionOption} sessionOption - Optional session option for query.
 * @returns {Promise<ISubmission>} A promise that resolves to the found submission.
 * @throws {AppError} If the submission is not found (404) or if an error occurs during the operation.
 */
const findSubmissionById = (
  submissionId: string, projection?: ProjectionType<ISubmission>, sessionOption?: SessionOption
): Promise<ISubmission> => Submission.findById(submissionId, projection, sessionOption)
  .populate(['project', 'upload']).exec()
  .then((submission) => {
    if (!submission) throw new AppError(404, `No submission found with the ID '${submissionId}'.`);
    return submission;
  })
  .catch((err: Error | unknown) => {
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while finding the submission with the ID '${submissionId}'.`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
  });

const runAndCreateSubmission = async (
  projectName: string, requestFile: RequestFile
): Promise<{ submission: ISubmission; executionOutput: object }> => {
  const submission = findSubmissionById('REMOVE_ME_DO_NOT_EXECUTE'); // TODO: REMOVE
  return new Promise((resolve) => resolve({ submission: {} as ISubmission, executionOutput: {} }));
};

/**
 * Downloads the uploaded files associated with the submission.
 *
 * @param {string} submissionId - The ID of the submission.
 * @returns {Promise<Buffer>} A promise that resolves to the downloaded zip buffer containing submission files.
 * @throws {AppError} If the submission does not exist (HTTP 404) or if there's an error during the download (HTTP 500).
 */
const downloadSubmissionFiles = (submissionId: string): Promise<Buffer> => findSubmissionById(submissionId, 'upload')
  .then(({ upload }) => uploadService.downloadUploadedFiles(`submission ${submissionId}`, upload));

/**
 * Deletes a submission by its ID.
 *
 * @param {string} submissionId - The ID of the submission to remove.
 * @param {SessionOption} [sessionOption] - Optional session to use for the deletion operation.
 * @returns {Promise<void>} A promise that resolves when the submission is successfully removed.
 * @throws {AppError} If the upload document does not exist (HTTP 404) or if there's an error during the deletion process (HTTP 500).
 */
const deleteSubmissionById = async (submissionId: string, sessionOption?: SessionOption): Promise<void> => {
  Logger.info(`Deleting the submission with the ID '${submissionId}'.`);

  await Submission.findByIdAndDelete(submissionId, sessionOption).exec().then((submissionDeleted) => {
    if (!submissionDeleted) {
      throw new AppError(404, `No submission found with the ID '${submissionId}'.`);
    }

    Logger.info(`Successfully deleted the submission with the ID '${submissionId}'.`);
  }).catch((err: AppError | Error | unknown) => {
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while deleting the submission with the ID '${submissionId}'.`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
  });
};

export default {
  findAllSubmissions,
  findSubmissionById,
  runAndCreateSubmission,
  downloadSubmissionFiles,
  deleteSubmissionById
};
