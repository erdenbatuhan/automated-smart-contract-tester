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
 * Finds an Upload by its ID.
 *
 * @param {string} uploadId - The ID of the Upload document to find.
 * @returns {Promise<IUpload>} A promise that resolves to the found Upload document.
 * @throws {AppError} HTTP Error with status code 404 if the upload is not found.
 */
const findUploadById = async (uploadId: string): Promise<IUpload> => Upload.findById(uploadId).exec()
  .then((upload) => {
    if (!upload) throw new AppError(404, `Upload with ID=${uploadId} not found!`);
    return upload;
  });

/**
 * Downloads uploaded files in a zip buffer.
 *
 * @param {string} name - The name associated with the upload.
 * @param {string} uploadId - The ID of the upload to download.
 * @returns {Promise<Buffer>} A promise that resolves to the downloaded zip buffer.
 * @throws {AppError} If an error occurs during the download.
 */
const getUploadedFilesInZipBuffer = async (name: string, uploadId: string): Promise<Buffer> => {
  // Find the document
  const upload = await findUploadById(uploadId);

  try {
    Logger.info(`Downloading the uploaded files for ${name} (Upload ID = ${uploadId}).`);

    // Get uploaded files and write them into zip buffer
    const zipBuffer = fsUtils.writeUploadedFilesToZipBuffer(upload);

    Logger.info(`Successfully downloaded the uploaded files for ${name} (Upload ID = ${uploadId}).`);
    return zipBuffer;
  } catch (err: AppError | Error | unknown) {
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while downloading the uploaded files for ${name} (Upload ID = ${uploadId}).`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
  }
};

export default { uploadZipBuffer, getUploadedFilesInZipBuffer };
