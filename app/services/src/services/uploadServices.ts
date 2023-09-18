import type { SessionOption } from 'mongoose';
import { HttpStatusCode } from 'axios';

import Logger from '@logging/Logger';
import AppError from '@errors/AppError';

import type { IUser } from '@models/User';
import Upload from '@models/Upload';
import type { IUpload } from '@models/Upload';

import fsUtils from '@utils/fsUtils';
import errorUtils from '@utils/errorUtils';

/**
 * Uploads a zip buffer.
 *
 * @param {IUser} user - The user performing the upload.
 * @param {string} uniqueName - The name associated with the upload.
 * @param {Buffer} zipBuffer - The zip buffer to upload.
 * @param {IUpload | null} [existingUpload] - An optional existing upload document. If provided, the function will update this document.
 * @param {SessionOption} [sessionOption] - An optional MongoDB session for the upload.
 * @returns {Promise<IUpload>} A promise that resolves to the uploaded data.
 * @throws {AppError} If an error occurs during the upload.
 */
const uploadZipBuffer = async (
  user: IUser, uniqueName: string, zipBuffer: Buffer, existingUpload?: IUpload | null, sessionOption?: SessionOption
): Promise<IUpload> => {
  try {
    Logger.info(`Uploading the zip buffer for ${uniqueName} by ${user.email}.`);
    const upload = existingUpload || new Upload();

    upload.deployer = user;
    upload.files = await fsUtils.getUploadedFilesFromZipBuffer(`${uniqueName}_upload_${upload._id}_${Date.now()}`, zipBuffer);

    return await upload.save(sessionOption).then((uploadSaved) => {
      Logger.info(`Successfully uploaded the zip buffer for ${uniqueName} by ${user.email}.`);
      return uploadSaved;
    });
  } catch (err: AppError | Error | unknown) {
    throw errorUtils.handleError(err, `An error occurred while uploading the zip buffer for ${uniqueName} by ${user.email}.`);
  }
};

/**
 * Downloads uploaded files associated with a context into a zip buffer.
 *
 * @param {string} contextName - The name associated with the upload.
 * @param {IUpload} upload - The Upload document storing the files to download.
 * @returns {Buffer} The downloaded zip buffer.
 * @throws {AppError} If an error occurs during the download, it will throw an AppError with a relevant status code.
 */
const downloadUploadedFiles = (contextName: string, upload: IUpload): Buffer => {
  try {
    Logger.info(`Downloading the uploaded files for ${contextName} (Upload ID = ${upload._id}).`);

    // Get uploaded files and write them into a zip buffer
    const zipBuffer = fsUtils.writeUploadedFilesToZipBuffer(upload);

    Logger.info(`Successfully downloaded the uploaded files for ${contextName} (Upload ID = ${upload._id}).`);
    return zipBuffer;
  } catch (err: AppError | Error | unknown) {
    throw errorUtils.handleError(err, `An error occurred while downloading the uploaded files for ${contextName} (Upload ID = ${upload._id}).`);
  }
};

/**
 * Deletes an upload by its ID.
 *
 * @param {IUpload} upload - The upload document to delete.
 * @param {SessionOption} [sessionOption] - Optional session to use for the deletion operation.
 * @returns {Promise<void>} A promise that resolves once the upload is successfully deleted.
 * @throws {AppError} If the upload document does not exist (HTTP 404) or if there's an error during the deletion process (HTTP 500).
 */
const deleteUpload = async (upload: IUpload, sessionOption?: SessionOption): Promise<void> => {
  Logger.info(`Deleting the upload with the ID '${upload._id}'.`);

  await Upload.findByIdAndDelete(upload._id, sessionOption).exec().then((uploadDeleted) => {
    if (!uploadDeleted) {
      throw new AppError(HttpStatusCode.NotFound, `No upload with the ID '${upload._id}' found.`);
    }

    Logger.info(`Successfully deleted the upload with the ID '${upload._id}'.`);
  }).catch((err: AppError | Error | unknown) => {
    throw errorUtils.handleError(err, `An error occurred while deleting the upload with the ID '${upload._id}'.`);
  });
};

export default { uploadZipBuffer, downloadUploadedFiles, deleteUpload };
