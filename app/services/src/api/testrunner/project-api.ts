import axios from 'axios';
import type { AxiosError } from 'axios';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import { TestRunnerApiEndpointConfig } from '@api/common/config/api-endpoint-config';
import type ApiError from '@api/testrunner/types/api-error';
import type ProjectUploadResponse from '@api/testrunner/types/project-upload-response';

import type { RequestFile } from '@utils/router-utils';
import apiErrorUtils from '@api/testrunner/utils/api-error-utils';
import apiFormDataUtils from '@api/testrunner/utils/api-form-data-utils';

/**
 * Uploads a project to the Test Runner service.
 *
 * @param {string} projectName - The name of the project to upload.
 * @param {RequestFile} requestFile - The file containing project data.
 * @returns {Promise<ProjectUploadResponse>} A Promise that resolves to the response data from the Test Runner service.
 * @throws {AppError} If an error occurs during the upload.
 */
const uploadProject = async (
  projectName: string, requestFile: RequestFile
): Promise<ProjectUploadResponse> => {
  Logger.info(`Uploading ${projectName} project to the Test Runner service to build the Docker image.`);

  return apiFormDataUtils.sendFormData<ProjectUploadResponse>(
    TestRunnerApiEndpointConfig.CONFIG_PROJECT_UPLOAD(projectName),
    requestFile,
    {
      successMessage: `Successfully uploaded ${projectName} project to the Test Runner service to build the Docker image.`,
      errorMessage: 'An error occurred while uploading the project to the Test Runner service.'
    }
  );
};

/**
 * Sends a project deletion request to the Test Runner service to remove its Docker image.
 *
 * @param {string} projectName - The name of the project to delete.
 * @returns {Promise<void>} A promise that resolves once the project is successfully deleted.
 * @throws {AppError} If there's an error during the deletion process, it will throw an AppError with a relevant status code.
 */
const sendProjectDeletionRequest = async (projectName: string): Promise<void> => {
  Logger.info(`Sending a project deletion request to the Test Runner service for the ${projectName} project to remove its Docker image.`);

  await axios.request(TestRunnerApiEndpointConfig.CONFIG_PROJECT_REMOVE(projectName)).then(({ status }) => {
    if (status !== 204) {
      throw new AppError(502, 'The service did not return an empty response');
    }

    Logger.info(`Successfully sent a project deletion request to the Test Runner service for the ${projectName} project to remove its Docker image.`);
  }).catch((err: AxiosError<ApiError>) => {
    // Check if the error is related to the image not being found. It's okay even if it's not found; it might have been deleted by another process.
    if (err.response?.data.error?.statusCode === 404) {
      Logger.warn(err.response?.data.error?.reason || `No image found for the ${projectName} project.`);
    } else { // Handle any other error
      const errorMessage = `An error occurred while sending a project deletion request to the Test Runner service for the ${projectName} project to remove its Docker image.`;
      throw apiErrorUtils.convertApiErrorToAppError(err, errorMessage) as AppError;
    }
  });
};

export default { uploadProject, sendProjectDeletionRequest };
