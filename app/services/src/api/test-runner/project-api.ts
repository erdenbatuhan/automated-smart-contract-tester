import axios from 'axios';
import type { AxiosError } from 'axios';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import apiConfig from '@config/api-config';

import errorUtils from '@utils/error-utils';
import type { RequestFile } from '@utils/router-utils';
import apiUtils from '@utils/api-utils';

export interface ProjectUploadInterface {
  image: object;
  output?: { tests?: string[]; };
}

export interface TestRunnerApiError {
  error?: AppError;
}

/**
 * Upload a project to the Test Runner service.
 *
 * @param {string} projectName - The name of the project to upload.
 * @param {RequestFile} requestFile - The file containing project data.
 * @returns {Promise<ProjectUploadInterface>} A Promise that resolves to the response data from the Test Runner service.
 * @throws {Error} If an error occurs during the upload.
 */
const uploadProject = async (
  projectName: string, requestFile: RequestFile
): Promise<ProjectUploadInterface> => {
  Logger.info(`Uploading ${projectName} project to the Test Runner service to build the Docker image.`);

  return apiUtils
    .sendFormData(apiConfig.TESTRUNNER_CONFIG_PROJECT_UPLOAD(projectName), requestFile)
    .then(({ data }) => {
      Logger.info(`Successfully uploaded ${projectName} project to the Test Runner service to build the Docker image.`);
      return data as ProjectUploadInterface;
    })
    .catch((err: AxiosError<TestRunnerApiError>) => {
      throw errorUtils.logAndGetError(new AppError(
        err.response?.data.error?.statusCode || 502,
        `An error occurred while uploading the project to the Test Runner service. (Error: ${err.response?.data.error?.message || err.message})`,
        err.response?.data.error?.reason || err.message
      ));
    });
};

/**
 * Send a project deletion request to the Test Runner service to remove its Docker image.
 *
 * @param {string} projectName - The name of the project to delete.
 * @returns {Promise<void>} A promise that resolves once the project is successfully deleted.
 * @throws {AppError} If there's an error during the deletion process, it will throw an AppError with a relevant status code.
 */
const sendProjectDeletionRequest = async (projectName: string): Promise<void> => {
  Logger.info(`Sending a project deletion request to the Test Runner service for the ${projectName} project to remove its Docker image.`);

  await axios.request(apiConfig.TESTRUNNER_CONFIG_PROJECT_REMOVE(projectName)).then(({ status }) => {
    if (status !== 204) {
      throw new AppError(502, 'The service did not return an empty response');
    }

    Logger.info(`Successfully sent a project deletion request to the Test Runner service for the ${projectName} project to remove its Docker image.`);
  }).catch((err: AxiosError<TestRunnerApiError>) => {
    throw errorUtils.logAndGetError(new AppError(
      err.response?.data.error?.statusCode || 502,
      `An error occurred while sending a project deletion request to the Test Runner service for the ${projectName} project to remove its Docker image. (Error: ${err.response?.data.error?.message || err.message})`,
      err.response?.data.error?.reason || err.message
    ));
  });
};

export default { uploadProject, sendProjectDeletionRequest };
