import type { Request } from 'express';
import type { ParsedQs } from 'qs';

import HTTPError from '@errors/http-error';

export interface IMulterRequest extends Request {
  file: Express.Multer.File;
}

export interface IModifiedRequest extends Request {
  locals: { [key: string]: string };
}

/**
 * Extracts required parameters from the request object's parameters.
 *
 * @param {Request} req - The Express.js request object.
 * @param {string[]} paramNames - An array of parameter names to extract.
 * @returns {{ [key: string]: string }} An object containing the extracted parameters.
 * @throws {HTTPError} If there's an error while extracting the parameters.
 */
const extractRequiredParams = (req: Request, paramNames: string[]): { [key: string]: string } => {
  try {
    return Object.fromEntries(paramNames.map((paramName) => [paramName, req.params[paramName]]));
  } catch (err: Error | unknown) {
    throw new HTTPError(400, `An error occurred while reading the request parameters (${paramNames}): ${(err as Error)?.message}`);
  }
};

/**
 * Extracts required query string parameters from the request object's query.
 *
 * @param {Request} req - The Express.js request object.
 * @param {string[]} paramNames - An array of query parameter names to extract.
 * @returns {ParsedQs} An object containing the extracted query parameters.
 * @throws {HTTPError} If there's an error while extracting the query parameters.
 */
const extractRequiredQuery = (req: Request, paramNames: string[]): ParsedQs => {
  try {
    return Object.fromEntries(paramNames.map((paramName) => [paramName, req.query[paramName]]));
  } catch (err: Error | unknown) {
    throw new HTTPError(400, `An error occurred while reading the query string parameters (${paramNames}): ${(err as Error)?.message}`);
  }
};

/**
 * Extracts file buffer from the request object.
 *
 * @param {IMulterRequest} req - The Express.js request object.
 * @returns {Buffer | undefined} The extracted file buffer.
 * @throws {HTTPError} If there's an error while extracting the file buffer.
 */
const extractFileBuffer = (req: IMulterRequest): Buffer => {
  try {
    return req.file.buffer;
  } catch (err: HTTPError | unknown) {
    throw new HTTPError(400, `An error occurred while reading the file buffer: ${(err as Error)?.message}`);
  }
};

export default { extractRequiredParams, extractRequiredQuery, extractFileBuffer };
