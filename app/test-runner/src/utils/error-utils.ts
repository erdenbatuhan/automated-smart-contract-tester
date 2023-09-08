import Logger from '@logging/logger';

/**
 * Creates an error with an additional message and logs it using a logger.
 *
 * @param {Error} err - The original error object.
 * @param {string} additionalMessage - An additional error message to append to the existing error message.
 * @returns {Error} A new error object with the combined message.
 */
const logAndGetError = (err: Error, additionalMessage?: string): Error => {
  if (additionalMessage) {
    err.message = `${additionalMessage} (Error: ${err.message})`;
  }

  Logger.error(err.message);
  return err;
};

export default { logAndGetError };
