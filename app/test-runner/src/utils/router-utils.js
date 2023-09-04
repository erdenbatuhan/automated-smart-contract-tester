const HTTPError = require('../errors/http-error');

/**
 * Extract required parameters from the request object's parameters.
 *
 * @param {import('express').Request} req - The Express.js request object.
 * @param {String[]} paramNames - An array of parameter names to extract.
 * @returns {Object} An object containing the extracted parameters.
 * @throws {HTTPError} If there's an error while extracting the parameters.
 */
const extractRequiredParams = (req, paramNames) => {
  try {
    return Object.fromEntries(paramNames.map((paramName) => [paramName, req.params[paramName]]));
  } catch (err) {
    throw new HTTPError(400, `An error occurred while reading the request parameters (${paramNames}): ${err.message}`);
  }
};

/**
 * Extract required query string parameters from the request object's query.
 *
 * @param {import('express').Request} req - The Express.js request object.
 * @param {String[]} paramNames - An array of query parameter names to extract.
 * @returns {Object} An object containing the extracted query parameters.
 * @throws {HTTPError} If there's an error while extracting the query parameters.
 */
const extractRequiredQuery = (req, paramNames) => {
  try {
    return Object.fromEntries(paramNames.map((paramName) => [paramName, req.query[paramName]]));
  } catch (err) {
    throw new HTTPError(400, `An error occurred while reading the query string parameters (${paramNames}): ${err.message}`);
  }
};

/**
 * Extract a file buffer from the request object.
 *
 * @param {import('express').Request} req - The Express.js request object.
 * @returns {Buffer} The extracted file buffer.
 * @throws {HTTPError} If there's an error while extracting the file buffer.
 */
const extractFileBuffer = (req) => {
  try {
    return req.file.buffer;
  } catch (err) {
    throw new HTTPError(400, `An error occurred while reading the file buffer: ${err.message}`);
  }
};

module.exports = { extractRequiredParams, extractRequiredQuery, extractFileBuffer };
