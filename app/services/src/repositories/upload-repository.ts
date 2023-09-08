import type { ClientSession } from 'mongoose';

import HTTPError from '@errors/http-error';

import Upload from '@models/upload';
import type { IUpload } from '@models/upload';

/**
 * Finds an Upload by its ID.
 *
 * @param {string} uploadId - The ID of the Upload document to find.
 * @returns {Promise<IUpload>} A promise that resolves to the found Upload document.
 * @throws {HTTPError} HTTP Error with status code 404 if the upload is not found.
 */
const findById = async (uploadId: string): Promise<IUpload> => {
  const upload = await Upload.findById(uploadId);

  if (!upload) throw new HTTPError(404, `Upload with ID=${uploadId} not found!`);
  return upload;
};

/**
 * Saves an Upload.
 *
 * @param {IUpload} upload - The Upload document to save.
 * @param {ClientSession | null} [session=null] - The Mongoose client session.
 * @returns {Promise<IUpload>} A promise that resolves to the saved Upload document.
 */
const save = (
  upload: IUpload, session: ClientSession | null = null
): Promise<IUpload> => upload.save({ session });

export default { findById, save };
