import type ForgeUnprocessedTestResults from '@forge/types/forge-unproc-test-results';
import type ForgeTestOutput from '@forge/types/forge-test-output';
import type { ForgeTestResult } from '@forge/types/forge-test-output';

import forgeCommonParser from '@/forge/parser/forge-parser-common';

/**
 * Converts Forge execution results into a more structured test output format.
 *
 * @param {ForgeUnprocessedTestResults} forgeExecutionResults - Unprocessed test results from Forge execution.
 * @returns {ForgeTestOutput['tests']} Test results processed.
 */
const getTestResultsFromForgeExecutionResults = (
  forgeExecutionResults: ForgeUnprocessedTestResults
): ForgeTestResult[] => Object.entries(forgeExecutionResults || [])
  .flatMap(([contract, { test_results }]) => Object.entries(test_results || [])
    .map(([test, { status, reason, decoded_logs, kind }]) => ({
      contract: forgeCommonParser.parseContractName(contract),
      test: forgeCommonParser.parseTestName(test),
      status,
      reason,
      logs: decoded_logs?.join('\n'),
      gas: Number.isNaN(kind?.Standard) ? null : kind?.Standard || null
    })));

/**
 * Returns the count of tests with a specific status in the test results.
 *
 * @param {ForgeTestResult[]} testResults - The test results.
 * @param {string} expectedStatus - The expected status to count.
 * @returns {number} The count of tests with the expected status.
 */
const getStatusCount = (testResults: ForgeTestResult[], expectedStatus: string): number => testResults
  .reduce((statusCount, { status }) => statusCount + Number(status === expectedStatus), 0);

/**
 * Returns the total gas usage from the test results.
 *
 * @param {ForgeTestResult[]} testResults - The test results.
 * @returns {number} The total gas usage.
 */
const getTotalGasUsage = (testResults: ForgeTestResult[]): number => testResults
  .reduce((totalGas, { gas }) => totalGas + (gas || 0), 0);

/**
 * Parses the test execution output of Forge and extracts the test results in a more structured format.
 *
 * @param {string | undefined | null} forgeTestExecutionOutput - Forge test execution output as a string.
 * @returns {ForgeTestOutput} Structured and processed test results.
 */
const extractTestResultsFromForgeTestExecutionOutput = (
  forgeTestExecutionOutput: string | undefined | null
): ForgeTestOutput => {
  const [jsonStart, jsonEnd] = [
    forgeTestExecutionOutput?.indexOf('{') || -1, forgeTestExecutionOutput?.lastIndexOf('}') || -1
  ]; // Start and end of the JSON

  const forgeExecutionResults = JSON.parse(forgeTestExecutionOutput?.substring(jsonStart, jsonEnd + 1) || '{}');
  const testResults = getTestResultsFromForgeExecutionResults(forgeExecutionResults);

  const numContracts = [...new Set(testResults.map(({ contract }) => contract))].length;
  const numTests = testResults.length;
  const numPassed = getStatusCount(testResults, 'Success');
  const numFailed = getStatusCount(testResults, 'Failure');
  const passed = !!numPassed && numPassed === numTests;
  const totalGas = getTotalGasUsage(testResults) || null;

  return {
    overall: { numContracts, numTests, passed, numPassed, numFailed, totalGas },
    tests: testResults
  };
};

export default {
  extractTestResultsFromForgeTestExecutionOutput
};
