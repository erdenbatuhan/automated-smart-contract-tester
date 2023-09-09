import type { Request } from 'express';

import HTTPError from '@errors/http-error';

import errorUtils from './error-utils';

export interface RequestFile extends Express.Multer.File {}

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
    throw errorUtils.getErrorWithoutDetails(`Failed to parse JSON object (${objectKey}) from the request body.`, httpErr);
  }
};

/**
 * Get the file attached to a request.
 *
 * @param {Request} req - The HTTP request object.
 * @returns {RequestFile} The file attached to the request.
 * @throws {HTTPError} If the request does not contain a file or an error occurs while reading the file buffer.
 */
const getRequestFile = (req: Request): RequestFile => {
  try {
    if (!req.file!.buffer) throw new Error('Cannot read the buffer.');
    return req.file!;
  } catch (err: Error | unknown) {
    const httpErr = new HTTPError(400, (err as Error)?.message);
    throw errorUtils.getErrorWithoutDetails('An error occurred while reading the file buffer.', httpErr);
  }
};

export default { parseJsonObjectFromBody, getRequestFile };
