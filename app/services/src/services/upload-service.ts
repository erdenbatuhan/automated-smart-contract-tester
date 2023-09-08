import Logger from '@logging/logger';
import HTTPError from '@errors/http-error';

import Upload from '@models/upload';
import type { IUpload } from '@models/upload';

import uploadRepository from '@repositories/upload-repository';

import fsUtils from '@utils/fs-utils';
import errorUtils from '@utils/error-utils';

/**
 * Uploads a zip buffer.
 *
 * @param {string} name - The name associated with the upload.
 * @param {Buffer} zipBuffer - The zip buffer to upload.
 * @returns {Promise<any>} A promise that resolves to the uploaded data.
 * @throws {HTTPError | Error} Error if an error occurs during the upload.
 */
const uploadZipBuffer = async (name: string, zipBuffer: Buffer): Promise<IUpload> => {
  try {
    Logger.info(`Uploading the zip buffer for ${name}.`);

    const upload = new Upload([]);
    upload.files = await fsUtils.getUploadedFilesFromZipBuffer(`project_${name}_upload_${upload._id}_${Date.now()}`, zipBuffer);

    return await uploadRepository.save(upload).then((uploadSaved) => {
      Logger.info(`Successfully uploaded the zip buffer for ${name}.`);
      return uploadSaved;
    });
  } catch (err: HTTPError | Error | unknown) {
    if (err instanceof HTTPError) {
      Logger.error(err.message);
      throw err;
    }

    throw errorUtils.getErrorWithoutDetails(`An error occurred while uploading the zip buffer for ${name}!`, err);
  }
};

/**
 * Downloads uploaded files in a zip buffer.
 *
 * @param {string} name - The name associated with the upload.
 * @param {string} uploadId - The ID of the upload to download.
 * @returns {Promise<Buffer>} A promise that resolves to the downloaded zip buffer.
 * @throws {HTTPError | Error} Error if an error occurs during the download.
 */
const getUploadedFilesInZipBuffer = async (name: string, uploadId: string): Promise<Buffer> => {
  Logger.info(`Downloading the uploaded files for ${name} (Upload ID = ${uploadId}).`);

  return uploadRepository.findById(uploadId).then((upload) => {
    Logger.info(`Successfully downloaded the uploaded files for ${name} (Upload ID = ${uploadId}).`);
    return fsUtils.writeUploadedFilesToZipBuffer(upload);
  }).catch((err: HTTPError | Error | unknown) => {
    if (err instanceof HTTPError) {
      Logger.error(err.message);
      throw err;
    }

    throw errorUtils.getErrorWithoutDetails(`An error occurred while downloading the uploaded files for ${name} (Upload ID = ${uploadId}).`, err);
  });
};

export default { uploadZipBuffer, getUploadedFilesInZipBuffer };
