import type {
  TestExecutionResults as ProcessedTestExecutionResults,
  GasDiffAnalysis,
  DockerContainerExecutionOutput
} from '@models/docker-container-history';

interface UnprocessedTestExecutionResults extends ProcessedTestExecutionResults {
  counterexample?: string;
  decoded_logs?: string[];
  kind?: { Standard: number; };
  traces?: string[];
  labeled_addresses?: object;
  breakpoints?: object;
}

interface UnprocessedContractTestExecutionResults {
  duration?: { secs: number; nanos: number; };
  test_results?: { [test: string]: UnprocessedTestExecutionResults };
  warnings?: object;
}

interface ProcessedContractTestExecutionResults {
  [test: string]: ProcessedTestExecutionResults;
}

/**
 * Remove ANSI color codes from a string.
 *
 * @param {string} str - The input string containing color codes.
 * @returns {string} A new string with color codes removed.
 */
const removeColorCodes = (str: string): string => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

/**
 * Extract test names from a gas snapshot text.
 *
 * @param {string} gasSnapshotText - The gas snapshot text to extract test names from.
 * @returns {string[]} An array of test names.
 */
const extractTestNamesFromGasSnapshot = (gasSnapshotText: string): string[] => {
  const testNames: string[] = [];

  gasSnapshotText.split('\n').forEach((line) => {
    const match = line.match(/^([^()]+)/); // Use regex to extract text before ()

    if (match) {
      const testName = match[1].trim();
      testNames.push(testName);
    }
  });

  return testNames;
};

/**
 * Extract test execution results from test output.
 *
 * @param {string} testOutput - The test output JSON string.
 * @returns {DockerContainerExecutionOutput} An object containing the extracted test execution results.
 */
const extractTestExecutionResults = (testOutput: string): DockerContainerExecutionOutput => {
  const getProcessedTestExecutionResults = (
    unprocessedTestExecResForContracts: { [contract: string]: UnprocessedContractTestExecutionResults }
  ): { [contract: string]: ProcessedContractTestExecutionResults } => Object.entries(unprocessedTestExecResForContracts)
    .reduce((
      newTestExecResForContracts: { [contract: string]: ProcessedContractTestExecutionResults },
      [contract, unprocessedTestExecResForContract]: [string, UnprocessedContractTestExecutionResults]
    ) => {
      newTestExecResForContracts[contract] = Object.entries(unprocessedTestExecResForContract.test_results || [])
        .reduce((
          newTestExecResults: { [test: string]: ProcessedTestExecutionResults },
          [test, unprocessedTestExecRes]: [string, UnprocessedTestExecutionResults]
        ) => {
          newTestExecResults[test] = {
            status: unprocessedTestExecRes.status,
            reason: unprocessedTestExecRes.reason,
            logs: unprocessedTestExecRes.decoded_logs?.join('\n'),
            gas: unprocessedTestExecRes.kind?.Standard
          };

          return newTestExecResults;
        }, {} as { [test: string]: ProcessedTestExecutionResults });

      return newTestExecResForContracts;
    }, {} as { [contract: string]: ProcessedContractTestExecutionResults });

  const getStatusCount = (
    testExecResForContracts: { [contract: string]: ProcessedContractTestExecutionResults }, expectedStatus: string
  ): number => Object.values(testExecResForContracts)
    .reduce((statusCountForContracts: number, testExecResForContract: ProcessedContractTestExecutionResults) => {
      const testExecResForTests = Object.values(testExecResForContract);
      const statusCount = testExecResForTests.filter(({ status }) => status === expectedStatus).length;

      return statusCountForContracts + statusCount;
    }, 0);

  const [jsonStart, jsonEnd] = [testOutput.indexOf('{'), testOutput.lastIndexOf('}')]; // Start and end of the JSON

  const unprocessedTestExecutionResults = JSON.parse(testOutput.substring(jsonStart, jsonEnd + 1));
  const processedTestExecutionResults = getProcessedTestExecutionResults(unprocessedTestExecutionResults);

  const numPassed = getStatusCount(processedTestExecutionResults, 'Success');
  const numFailed = getStatusCount(processedTestExecutionResults, 'Failure');

  return {
    overall: { passed: !numFailed, numPassed, numFailed },
    tests: processedTestExecutionResults
  };
};

/**
 * Extract gas difference analysis from test output.
 *
 * @param {string} testOutput - The test output text.
 * @returns {DockerContainerExecutionOutput} An object containing the extracted gas difference analysis.
 */
const extractGasDiffAnalysis = (testOutput: string): DockerContainerExecutionOutput => {
  const extractGasDiffNumbersFromGasParts = (gasParts: string): [number, number] => {
    const [gasDiff, gasDiffPercentage] = gasParts.split(' ');
    return [parseInt(gasDiff, 10), parseFloat(gasDiffPercentage.replace('(', '').replace('%)', ''))];
  };

  const jsonEnd = testOutput.lastIndexOf('}'); // End of the JSON
  const lines = testOutput.substring(jsonEnd + 1).trim().split('\n').map(removeColorCodes);

  // Overall gas diff
  const [overallGasDiffLine] = lines.slice(-1);
  const [, overallGasDiffParts] = overallGasDiffLine.split('Overall gas change: ');
  const [
    overallGasDiff, overallGasDiffPercentage
  ]: [
    GasDiffAnalysis['overallGasDiff'], GasDiffAnalysis['overallGasDiffPercentage']
  ] = extractGasDiffNumbersFromGasParts(overallGasDiffParts);

  // Gas diff for each test
  const testGasDiffLines = lines.slice(0, -1);
  const testGasDiffs: GasDiffAnalysis['testGasDiffs'] = testGasDiffLines.map((line) => {
    const [testName, gasParts] = line.split(' (gas: ');
    const [gasDiff, gasDiffPercentage] = extractGasDiffNumbersFromGasParts(gasParts);

    return { test: testName.trim(), gasDiff, gasDiffPercentage };
  });

  return {
    gasDiffAnalysis: { overallGasDiff, overallGasDiffPercentage, testGasDiffs } as GasDiffAnalysis
  } as DockerContainerExecutionOutput;
};

export default { extractTestNamesFromGasSnapshot, extractTestExecutionResults, extractGasDiffAnalysis };
