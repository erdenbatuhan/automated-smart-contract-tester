import { HttpStatusCode } from 'axios';
import type { AxiosError } from 'axios';

import AppError from '@errors/app-error';
import type ApiError from '@api/testrunner/types/api-error';

import errorUtils from '@utils/error-utils';

/**
 * Convert errors returned from the Test Runner API into an AppError, log them, and return an AppError with appropriate details.
 *
 * @param {AxiosError<ApiError>} err - The Axios error containing the TestRunnerApiError response.
 * @param {string} message - A descriptive error message to include in the AppError.
 * @returns {AppError} An AppError with details based on the Test Runner API error response or the Axios error message.
 * @throws {AppError} Throws an AppError with the constructed details.
 */
const convertApiErrorToAppError = (err: AxiosError<ApiError>, message: string): AppError => {
  const apiError = err.response?.data.error as AppError;

  return errorUtils.handleError(
    new AppError(apiError?.statusCode, err.message, apiError?.reason),
    `${message} (Error: ${apiError?.message || err.message})`,
    HttpStatusCode.BadGateway
  );
};

export default { convertApiErrorToAppError };
