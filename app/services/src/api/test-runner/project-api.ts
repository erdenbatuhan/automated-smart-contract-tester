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
const uploadProjectToTestRunnerService = async (
  projectName: string, requestFile: RequestFile
): Promise<ProjectUploadInterface> => {
  Logger.info(`Uploading ${projectName} project to the Test Runner service to build the Docker image.`);

  return apiUtils
    .sendFormData(apiConfig.TESTRUNNER_URL_PROJECT_UPLOAD(projectName), 'PUT', requestFile)
    .then(({ data }) => {
      Logger.info(`Successfully uploaded ${projectName} project to the Test Runner service to build the Docker image.`);
      return data as ProjectUploadInterface;
    })
    .catch((err: AxiosError<TestRunnerApiError>) => {
      throw errorUtils.logAndGetError(new AppError(
        err.response?.data.error?.statusCode || 417,
        `An error occurred while uploading the project to the Test Runner service. (Error: ${err.response?.data.error?.message || err.message})`,
        err.response?.data.error?.reason || err.message
      ));
    });
};

export default { uploadProjectToTestRunnerService };
