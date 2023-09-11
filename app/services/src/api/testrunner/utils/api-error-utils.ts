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
const convertApiErrorToAppError = (err: AxiosError<ApiError>, message: string): AppError => errorUtils
  .logAndGetError(new AppError(
    err.response?.data.error?.statusCode || 502,
    `${message} (Error: ${err.response?.data.error?.message || err.message})`,
    err.response?.data.error?.reason || err.message
  )) as AppError;

export default { convertApiErrorToAppError };
