import type { SessionOption } from 'mongoose';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import Upload from '@models/upload';
import type { IUpload } from '@models/upload';

import fsUtils from '@utils/fs-utils';
import errorUtils from '@utils/error-utils';

/**
 * Uploads a zip buffer.
 *
 * @param {string} name - The name associated with the upload.
 * @param {Buffer} zipBuffer - The zip buffer to upload.
 * @param {IUpload | null} [existingUpload] - An optional existing upload document. If provided, the function will update this document.
 * @param {SessionOption} [sessionOption] - An optional MongoDB session for the upload.
 * @returns {Promise<IUpload>} A promise that resolves to the uploaded data.
 * @throws {AppError} If an error occurs during the upload.
 */
const uploadZipBuffer = async (
  name: string, zipBuffer: Buffer, existingUpload?: IUpload | null, sessionOption?: SessionOption
): Promise<IUpload> => {
  try {
    Logger.info(`Uploading the zip buffer for ${name}.`);

    const upload = existingUpload || new Upload();
    upload.files = await fsUtils.getUploadedFilesFromZipBuffer(`${name}_upload_${upload._id}_${Date.now()}`, zipBuffer);

    return await upload.save(sessionOption).then((uploadSaved) => {
      Logger.info(`Successfully uploaded the zip buffer for ${name}.`);
      return uploadSaved;
    });
  } catch (err: AppError | Error | unknown) {
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while uploading the zip buffer for ${name}!`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
  }
};

/**
 * Downloads uploaded files in a zip buffer.
 *
 * @param {string} contextName - The name associated with the upload.
 * @param {IUpload} upload - The Upload document storing the documents to download.
 * @returns {Promise<Buffer>} A promise that resolves to the downloaded zip buffer.
 * @throws {AppError} If an error occurs during the download, it will throw an AppError with a relevant status code.
 */
const downloadUploadedFiles = async (contextName: string, upload: IUpload): Promise<Buffer> => {
  try {
    Logger.info(`Downloading the uploaded files for ${contextName} (Upload ID = ${upload._id}).`);

    // Get uploaded files and write them into a zip buffer
    const zipBuffer = fsUtils.writeUploadedFilesToZipBuffer(upload);

    Logger.info(`Successfully downloaded the uploaded files for ${contextName} (Upload ID = ${upload._id}).`);
    return zipBuffer;
  } catch (err: AppError | Error | unknown) {
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while downloading the uploaded files for ${contextName} (Upload ID = ${upload._id}).`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
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
      throw new AppError(404, `No upload with the ID '${upload._id}' found.`);
    }

    Logger.info(`Successfully deleted the upload with the ID '${upload._id}'.`);
  }).catch((err: AppError | Error | unknown) => {
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while deleting the upload with the ID '${upload._id}'.`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
  });
};

export default { uploadZipBuffer, downloadUploadedFiles, deleteUpload };
