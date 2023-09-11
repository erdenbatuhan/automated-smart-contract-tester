import axios from 'axios';
import type { AxiosRequestConfig, AxiosError } from 'axios';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';
import type TestRunnerApiError from '@api/testrunner/types/test-runner-api-error';

import type { RequestFile } from '@utils/router-utils';
import apiErrorUtils from './api-error-utils';

/**
 * Send a FormData request with a file to the specified URL.
 *
 * @template T
 * @param {AxiosRequestConfig} requestConfig - The request configuration (e.g., URL, HTTP method).
 * @param {RequestFile} requestFile - The file to include in the FormData.
 * @param {Object} messages - Messages for success and error scenarios.
 * @param {string} messages.successMessage - The success message to log.
 * @param {string} messages.errorMessage - The error message to log.
 * @returns {Promise<T>} A Promise that resolves to the Axios response data of type T.
 * @throws {AppError} Throws an AppError if an error occurs during the request.
 */
const sendFormData = <T>(
  requestConfig: AxiosRequestConfig, requestFile: RequestFile,
  messages: { successMessage: string; errorMessage: string }
): Promise<T> => {
  // Create a Blob from the Buffer
  const blob = new Blob([Buffer.from(requestFile.buffer)], { type: 'application/octet-stream' });

  // Create a FormData object and append the file
  const formData = new FormData();
  formData.append(requestFile.fieldname, blob, requestFile.filename);

  // Send the FormData request using Axios
  return axios.request({
    ...requestConfig,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(({ data }) => {
    Logger.info(messages.successMessage);
    return data as T;
  }).catch((err: AxiosError<TestRunnerApiError>) => {
    throw apiErrorUtils.convertTestRunnerApiErrorToAppError(err, messages.errorMessage) as AppError;
  });
};

export default { sendFormData };
