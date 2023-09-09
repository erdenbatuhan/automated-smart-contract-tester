import type { Request } from 'express';

import HTTPError from '@errors/http-error';

import errorUtils from './error-utils';

/**
 * Parses a JSON string from the request body and returns it as an object.
 *
 * @param {Request} req - The Express.js request object.
 * @param {string} objectKey - The key of the JSON object in the request body.
 * @param {boolean} [required=false] - Indicates whether the object is required in the request body.
 * @returns {object | undefined} The parsed JSON object.
 * @throws {HTTPError} If the JSON parsing fails or if the object is not found in the request body.
 */
const parseJsonObjectFromBody = (req: Request, objectKey: string, required: boolean = false): object | undefined => {
  try {
    const jsonString = req.body[objectKey];
    if (!jsonString && required) throw new HTTPError(400, `Object (${objectKey}) not found in the request body.`);

    return jsonString && JSON.parse(jsonString);
  } catch (err: Error | unknown) {
    const httpErr = new HTTPError(400, (err as Error)?.message);
    throw errorUtils.logAndGetError(httpErr, `Failed to parse JSON object (${objectKey}) from the request body.`);
  }
};

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

export default { parseJsonObjectFromBody, extractFileBuffer };
