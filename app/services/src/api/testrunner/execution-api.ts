import Logger from '@logging/logger';

import { ITestExecutionArguments } from '@models/schemas/test-execution-arguments';

import { TestRunnerApiEndpointConfig } from '@api/common/config/api-endpoint-config';
import type SubmissionExecutionResponse from '@api/testrunner/types/submission-execution-response';

import type { RequestFile } from '@utils/router-utils';
import apiFormDataUtils from '@api/testrunner/utils/api-form-data-utils';

/**
 * Transfer source files to the Test Runner service for test execution in the specified project.
 *
 * @param {string} projectName - The name of the project in which the source files will be tested.
 * @param {RequestFile} requestFile - The file containing project data.
 * @param {ITestExecutionArguments} [testExecutionArguments] - Additional arguments for test execution (optional)
 * @returns {Promise<SubmissionExecutionResponse>} A Promise that resolves to the response data from the Test Runner service.
 * @throws {AppError} If an error occurs during the upload.
 */
const executeSubmission = async (
  projectName: string, requestFile: RequestFile, testExecutionArguments?: ITestExecutionArguments
): Promise<SubmissionExecutionResponse> => {
  Logger.info(`Initiating submission upload for the ${projectName} project to the Test Runner service for Docker image execution.`);

  return apiFormDataUtils.sendFormData<SubmissionExecutionResponse>(
    TestRunnerApiEndpointConfig.CONFIG_TEST_EXECUTION(projectName),
    requestFile,
    {
      successMessage: `The submission for the ${projectName} project has been successfully uploaded to the Test Runner service, and the Docker image has been executed.`,
      errorMessage: `An error occurred while uploading the submission for the ${projectName} project to the Test Runner service.`
    },
    testExecutionArguments && { execArgs: testExecutionArguments }
  );
};

export default { executeSubmission };
