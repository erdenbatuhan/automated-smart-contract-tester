import AppError from '@errors/app-error';
import Logger from '@logging/logger';

/**
 * Logs the error and then returns it, optionally with a combined message for AppError objects.
 *
 * @param {AppError | Error | unknown} err - The original error object.
 * @returns {AppError | Error | unknown} The original error object, possibly with an additional message for AppError objects.
 */
const logAndGetError = (err?: AppError | Error | unknown): AppError | Error | unknown => {
  let message = (err as Error)?.message;
  if (err instanceof AppError) message = `${message} (Reason: ${err.reason})`;

  Logger.error(message);
  return err;
};

export default { logAndGetError };
