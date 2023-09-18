import { HttpStatusCode } from 'axios';

import AppError from '@errors/AppError';
import Logger from '@logging/Logger';

/**
 * Handles an error by logging it and returning a new AppError object with a custom message or the original error message.
 *
 * @param {AppError | Error | unknown} err - The original error object.
 * @param {string} [message] - The custom error message to include in the returned AppError object. If not provided, the original error message is used.
 * @param {HttpStatusCode} [defaultStatusCode=HttpStatusCode.InternalServerError] - The default HTTP status code to use if the error is not an AppError.
 * @returns {AppError} A new AppError object with the specified message or the original error message.
 */
const handleError = (
  err: AppError | Error | unknown, message?: string, defaultStatusCode: HttpStatusCode = HttpStatusCode.InternalServerError
): AppError => {
  const errStatusCode = (err as AppError)?.statusCode || defaultStatusCode;
  const errMessage = (err as Error)?.message;
  const errReason = (err as AppError)?.reason || errMessage;

  if (errMessage !== errReason) {
    Logger.error(`${errMessage} (Reason: ${errReason})`);
  } else {
    Logger.error(errMessage);
  }

  return new AppError(errStatusCode, message || errMessage, errReason);
};

export default { handleError };
