import { Request } from 'express';

import HTTPError from '../errors/http-error';

/**
 * Extract required parameters from the request object's parameters.
 *
 * @param {Request} req - The Express.js request object.
 * @param {string[]} paramNames - An array of parameter names to extract.
 * @returns {Record<string, string>} An object containing the extracted parameters.
 * @throws {HTTPError} If there's an error while extracting the parameters.
 */
const extractRequiredParams = (req: Request, paramNames: string[]): Record<string, string> => {
  try {
    return Object.fromEntries(paramNames.map((paramName) => [paramName, req.params[paramName]]));
  } catch (err: HTTPError | Error | any) {
    throw new HTTPError(400, `An error occurred while reading the request parameters (${paramNames}): ${err.message}`);
  }
};

/**
 * Extract required query string parameters from the request object's query.
 *
 * @param {Request} req - The Express.js request object.
 * @param {string[]} paramNames - An array of query parameter names to extract.
 * @returns {Record<string, string>} An object containing the extracted query parameters.
 * @throws {HTTPError} If there's an error while extracting the query parameters.
 */
const extractRequiredQuery = (req: Request, paramNames: string[]): Record<string, string> => {
  try {
    return Object.fromEntries(paramNames.map((paramName) => [paramName, (req as any).query[paramName]]));
  } catch (err: HTTPError | Error | any) {
    throw new HTTPError(400, `An error occurred while reading the query string parameters (${paramNames}): ${err.message}`);
  }
};

/**
 * Extract a file buffer from the request object.
 *
 * @param {Request} req - The Express.js request object.
 * @returns {Buffer} The extracted file buffer.
 * @throws {HTTPError} If there's an error while extracting the file buffer.
 */
const extractFileBuffer = (req: Request): Buffer => {
  try {
    return (req as any).file.buffer;
  } catch (err: HTTPError | Error | any) {
    throw new HTTPError(400, `An error occurred while reading the file buffer: ${err.message}`);
  }
};

export default { extractRequiredParams, extractRequiredQuery, extractFileBuffer };
