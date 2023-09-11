import Logger from '@logging/logger';

import TestStatus from '@models/enums/test-status';

import type SubmissionExecutionResponse from '@api/testrunner/types/submission-execution-response';

/**
 * Extracts the test status from the execution output of a submission.
 *
 * @param {SubmissionExecutionResponse} executionOutput - The execution output of a submission.
 * @returns {TestStatus} The test status, which can be either PASSED or FAILED.
 */
const extractTestStatus = (executionOutput: SubmissionExecutionResponse): TestStatus => {
  Logger.info('Extracting the test status from the execution output.');
  return executionOutput.output?.overall?.passed ? TestStatus.PASSED : TestStatus.FAILED;
};

/**
 * Calculate a test score based on the provided execution output.
 *
 * @param {SubmissionExecutionResponse} executionOutput - The execution output from the Test Runner service.
 * @returns {object} An object containing the calculated score and additional information.
 * @throws {AppError | Error} If there is an issue with the provided execution output.
 */
const calculateTestScoreAndGenerateResults = (executionOutput: SubmissionExecutionResponse): object => {
  Logger.info('Calculating the test score based on the execution output.');
  return ({ score: 0, ...executionOutput });
};

export default { extractTestStatus, calculateTestScoreAndGenerateResults };
