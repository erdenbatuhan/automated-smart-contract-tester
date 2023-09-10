import HTTPError from '@errors/http-error';
import Logger from '@logging/logger';

/**
 * Logs the error and then returns it, optionally with a combined message for HTTPError objects.
 *
 * @param {HTTPError | Error | unknown} err - The original error object.
 * @returns {HTTPError | Error | unknown} The original error object, possibly with an additional message for HTTPError objects.
 */
const logAndGetError = (err?: HTTPError | Error | unknown): HTTPError | Error | unknown => {
  let message = (err as Error)?.message;
  if (err instanceof HTTPError) message = `${message} (Reason: ${err.reason})`;

  Logger.error(message);
  return err;
};

export default { logAndGetError };
