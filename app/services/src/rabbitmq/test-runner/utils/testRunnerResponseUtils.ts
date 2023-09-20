import Logger from '@Logger';
import AppError from '@errors/AppError';

import TestRunnerResponse from '@rabbitmq/test-runner/dto/responses/TestRunnerResponse';

/**
 * Checks if a TestRunnerResponse represents a successful response (status code in the range [200, 300)).
 *
 * @param {TestRunnerResponse} response - The response to check.
 * @returns {boolean} True if the response is successful, false otherwise.
 */
const isSuccessfulResponse = (response: TestRunnerResponse): boolean => response.statusCode >= 200 && response.statusCode < 300;

/**
 * Handles a TestRunnerResponse and converts it into a data format that can be utilized in subsequent parts of this service.
 *
 * @template T
 * @param {TestRunnerResponse} response - The TestRunnerResponse to handle.
 * @param {Object} options - Configuration options.
 * @param {string} options.successMessage - The success message to log if the response is successful.
 * @param {string} options.errorMessage - The error message to log if the response indicates an error.
 * @returns {{ isError: boolean, data: T | AppError }} An object with isError flag and data.
 */
const handleTestRunnerResponse = <T>(
  response: TestRunnerResponse,
  { successMessage, errorMessage }: { successMessage: string; errorMessage: string }
): { isError: boolean; data: T | AppError; } => {
  // Handle successful response
  if (isSuccessfulResponse(response)) {
    Logger.info(successMessage);
    return {
      isError: false,
      data: response.data as T
    };
  }

  // Handle errors
  const { error } = response.data as { error: AppError; };
  Logger.error(errorMessage);

  return {
    isError: true,
    data: new AppError(response.statusCode, `${errorMessage} (Error: ${error.message})`, error.reason)
  };
};

export default { handleRabbitResponse: handleTestRunnerResponse };
