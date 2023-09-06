import Logger from '../logging/logger';

/**
 * Logs an error message and throws an error with an abstract error message.
 *
 * @param {string} abstractErrorMessage - The abstract error message to log and include in the thrown error.
 * @param {Error | unknown} fullError - The full error object to log and throw.
 * @returns {Error} The full error object with the abstract error message as its message property.
 */
const getErrorWithoutDetails = (abstractErrorMessage: string, fullError: Error | unknown): Error => {
  if (!(fullError instanceof Error)) return new Error();

  Logger.error(`${abstractErrorMessage} (${fullError?.message})`);

  fullError.message = abstractErrorMessage;
  return fullError;
};

export default { getErrorWithoutDetails };
