const Logger = require('../logging/logger');

/**
 * Logs an error message and throws an error with an abstract error message.
 *
 * @param {String} abstractErrorMessage - The abstract error message to log and include in the thrown error.
 * @param {Error} fullError - The full error object to log and throw.
 * @throws {Error} The full error object with the abstract error message as its message property.
 */
const getErrorWithoutDetails = (abstractErrorMessage, fullError) => {
  Logger.error(`${abstractErrorMessage} (${fullError ? fullError.message : 'null'})`);

  fullError.message = abstractErrorMessage;
  throw fullError;
};

module.exports = { getErrorWithoutDetails };
