import type { Request } from 'express';

import HTTPError from '@errors/http-error';

import errorUtils from './error-utils';

/**
 * Extracts file buffer from the request object.
 *
 * @param {Request} req - The Express.js request object.
 * @returns {Buffer} The extracted file buffer.
 * @throws {HTTPError} If there's an error while extracting the file buffer.
 */
const extractFileBuffer = (req: Request): Buffer => {
  try {
    return req.file!.buffer;
  } catch (err: Error | unknown) {
    const httpErr = new HTTPError(400, (err as Error)?.message);
    throw errorUtils.logAndGetError(httpErr, 'An error occurred while reading the file buffer.');
  }
};

export default { extractFileBuffer };
