import Logger from '@Logger';

import TestStatus from '@models/enums/TestStatus';

import type ContainerExecutionResponse from '@rabbitmq/test-runner/dto/responses/ContainerExecutionResponse';

/**
 * Extracts the test status from the execution output of a submission.
 *
 * @param {ContainerExecutionResponse} containerExecutionResponse - The execution output of a submission.
 * @returns {TestStatus} The test status, which can be either PASSED or FAILED.
 */
const extractTestStatus = (containerExecutionResponse: ContainerExecutionResponse): TestStatus => {
  Logger.info('Extracting the test status from the execution output.');
  return containerExecutionResponse.container?.output?.overall?.passed ? TestStatus.PASSED : TestStatus.FAILED;
};

/**
 * Calculate a test score based on the provided execution output.
 *
 * @param {ContainerExecutionResponse} containerExecutionResponse - The execution output from the Test Runner service.
 * @returns {object} An object containing the calculated score and additional information.
 * @throws {AppError | Error} If there is an issue with the provided execution output.
 */
const calculateTestScoreAndGenerateResults = (containerExecutionResponse: ContainerExecutionResponse): object => {
  Logger.info('Calculating the test score based on the execution output.');
  return ({ score: 0, ...containerExecutionResponse.container });
};

export default { extractTestStatus, calculateTestScoreAndGenerateResults };
