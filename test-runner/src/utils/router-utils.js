const HTTPError = require("../errors/http-error");

const extractRequiredParams = (req, paramNames) => {
  try {
    return Object.fromEntries(paramNames.map(paramName => [paramName, req.params[paramName]]));
  } catch (err) {
    throw new HTTPError(400, `An error occurred while reading the request parameters (${paramNames}): ${err.message}`);
  }
};

const extractRequiredQuery = (req, paramNames) => {
  try {
    return Object.fromEntries(paramNames.map(paramName => [paramName, req.query[paramName]]));
  } catch (err) {
    throw new HTTPError(400, `An error occurred while reading the query string parameters (${paramNames}): ${err.message}`);
  }
};

const extractFileBuffer = (req) => {
  try {
    return req.file.buffer;
  } catch (err) {
    throw new HTTPError(400, `An error occurred while reading the file buffer: ${err.message}`);
  }
};

module.exports = { extractRequiredParams, extractRequiredQuery, extractFileBuffer };
