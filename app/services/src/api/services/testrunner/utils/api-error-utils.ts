import { HttpStatusCode } from 'axios';
import type { AxiosError } from 'axios';

import AppError from '@errors/app-error';
import type ApiError from '@api/services/testrunner/types/api-error';

import ContainerExecutionResponse from '@api/services/testrunner/types/container-execution-response';

import errorUtils from '@utils/error-utils';

/**
 * Converts errors returned from the Test Runner API into an AppError, log them, and return an AppError with appropriate details.
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

/**
 * Handles errors occurred during container execution.
 *
 * @param {ContainerExecutionResponse} response - The response from the container execution.
 * @returns {AppError} An AppError with details extracted from the project upload response.
 */
const handleContainerError = (response: ContainerExecutionResponse): AppError => errorUtils.handleError(new AppError(
  HttpStatusCode.BadGateway,
  response.container?.output?.error,
  `${response.status} (Docker Container Exit Code = ${response.container?.statusCode})`
));

export default { convertApiErrorToAppError, handleContainerError };
