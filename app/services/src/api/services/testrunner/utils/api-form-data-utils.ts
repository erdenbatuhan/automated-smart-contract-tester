import axios from 'axios';
import type { AxiosRequestConfig, AxiosError } from 'axios';
import FormData from 'form-data';

import Logger from '@logging/logger';
import type AppError from '@errors/app-error';
import type ApiError from '@api/services/testrunner/types/api-error';

import type { RequestFile } from '@utils/router-utils';
import apiErrorUtils from './api-error-utils';

/**
 * Send a FormData request with a file and optional additional data to the specified URL.
 *
 * @template T
 * @param {AxiosRequestConfig} requestConfig - The request configuration (e.g., URL, HTTP method).
 * @param {RequestFile} requestFile - The file to include in the FormData.
 * @param {object} messages - Messages for success and error scenarios.
 * @param {string} messages.successMessage - The success message to log.
 * @param {string} messages.errorMessage - The error message to log.
 * @param {object} [requestBody] - Optional additional data to include in the FormData.
 * @returns {Promise<T>} A Promise that resolves to the Axios response data of type T.
 * @throws {AppError} Throws an AppError if an error occurs during the request.
 */
const sendFormData = <T>(
  requestConfig: AxiosRequestConfig, requestFile: RequestFile,
  messages: { successMessage: string; errorMessage: string },
  requestBody?: { [key: string]: object }
): Promise<T> => {
  // Create a FormData object and append the file
  const formData = new FormData();
  formData.append(
    requestFile.fieldname,
    requestFile.buffer,
    { filename: requestFile.originalname }
  );

  // Append the request body if provided
  if (requestBody) {
    Object.entries(requestBody).forEach(([key, obj]: [string, object]) => {
      formData.append(key, JSON.stringify(obj) as string);
    });
  }

  // Send the FormData request using Axios
  return axios.request({
    ...requestConfig,
    data: formData,
    maxBodyLength: Infinity,
    headers: { ...formData.getHeaders() }
  }).then(({ data }) => {
    Logger.info(messages.successMessage);
    return data as T;
  }).catch((err: AxiosError<ApiError>) => {
    throw apiErrorUtils.convertApiErrorToAppError(err, messages.errorMessage) as AppError;
  });
};

export default { sendFormData };
