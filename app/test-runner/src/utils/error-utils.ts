import HTTPError from '@errors/http-error';
import Logger from '@logging/logger';

/**
 * Creates an error with an additional message and logs it using a logger.
 *
 * @param {HTTPError | Error} err - The original error object.
 * @param {string} additionalMessage - An additional error message to append to the existing error message.
 * @returns {HTTPError | Error} A new error object with the combined message.
 */
const logAndGetError = (err?: HTTPError | Error, additionalMessage?: string): HTTPError | Error => {
  err = err || new Error('An error occurred!');

  if (err instanceof HTTPError) err.data = { message: err.message }; // Add data
  if (additionalMessage) err.message = `${additionalMessage} (Error: ${err.message})`; // Append additional message

  Logger.error(err.message);
  return err;
};

export default { logAndGetError };
