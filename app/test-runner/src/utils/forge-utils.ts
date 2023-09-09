import executorEnvironmentConfig from '~data/forge/executor-environment-config.json';

import type {
  TestExecutionResults as ProcessedTestExecutionResults,
  GasDiffAnalysis,
  DockerContainerExecutionOutput
} from '@models/docker-container-history';

import constantUtils from '@utils/constant-utils';

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

const VALID_TEST_EXECUTION_ARGUMENTS = Object.keys(executorEnvironmentConfig);

/**
 * Converts a camel-cased string to an executable argument format with a double hyphen prefix.
 *
 * @param {string} input - The camel-cased input string to convert.
 * @returns {string} The converted string with a double hyphen prefix (e.g., "--example-string").
 */
const convertCamelToExecArg = (input: string): string => `--${input.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;

/**
 * Converts an object of Forge test execution arguments to a command-line execution argument.
 *
 * @param {object | undefined} executionArguments - The object containing Forge test execution arguments.
 * @returns {string} A command-line execution string representing the provided arguments.
 */
const convertTestExecutionArgsToString = (executionArguments: object | undefined): string => (
  executionArguments ? Object.entries(executionArguments)
    .filter(([argumentName]) => VALID_TEST_EXECUTION_ARGUMENTS.includes(argumentName))
    .map(([argumentName, argumentValue]) => `${convertCamelToExecArg(argumentName)} ${argumentValue}`)
    .join(' ') : ''
);

/**
 * Get the test execution command with optional execution arguments.
 *
 * @param {object=} [execArgs] - Optional execution arguments to be included in the command.
 * @returns {string} The test execution command with execution arguments (if provided).
 */
const getTestExecutionCommand = (execArgs?: object): string => {
  const executionArgsString = convertTestExecutionArgsToString(execArgs);
  let executionCommand = constantUtils.FORGE_COMMANDS.COMPARE_SNAPSHOTS;

  if (executionArgsString) {
    executionCommand = `${executionCommand} ${executionArgsString}`;
  }

  return executionCommand;
};

/**
 * Get the command to retrieve the gas snapshot content.
 *
 * @returns {string} The command to read the gas snapshot content.
 */
const getGasSnapshotRetrievalCommand = (): string => `cat ${constantUtils.PROJECT_FILES.GAS_SNAPSHOT}`;

/**
 * Extracts test names from a gas snapshot text.
 *
 * @param {string | undefined} gasSnapshotText - The gas snapshot text to extract test names from.
 * @returns {string[]} An array of test names.
 */
const retrieveTestNamesFromGasSnapshot = (gasSnapshotText: string | undefined): string[] => {
  const testNames: string[] = [];

  gasSnapshotText?.split('\n').forEach((line) => {
    const match = line.match(/^([^()]+)/); // Use regex to extract text before ()

    if (match) {
      const testName = match[1].trim();
      testNames.push(testName);
    }
  });

  return testNames;
};

/**
 * Extracts test execution results from test output.
 *
 * @param {string | undefined} testOutput - The test output JSON string.
 * @returns {DockerContainerExecutionOutput} An object containing the extracted test execution results.
 */
const extractTestExecutionResultsFromExecutionOutput = (
  testOutput: string | undefined
): DockerContainerExecutionOutput => {
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
    testExecutionResults: { [contract: string]: ProcessedContractTestExecutionResults }, expectedStatus: string
  ): number => Object.values(testExecutionResults)
    .reduce((totalStatusCount: number, testExecResForContract: ProcessedContractTestExecutionResults) => {
      const testExecResForTests = Object.values(testExecResForContract);
      const statusCount = testExecResForTests.filter(({ status }) => status === expectedStatus).length;

      return totalStatusCount + statusCount;
    }, 0);

  const getTotalGasUsage = (
    testExecutionResults: { [contract: string]: ProcessedContractTestExecutionResults }
  ): number => Object.values(testExecutionResults)
    .reduce((totalGas: number, testExecResForContract: ProcessedContractTestExecutionResults) => {
      const testExecResForTests = Object.values(testExecResForContract);
      const contractGasUsage = testExecResForTests.reduce((gasUsage, { gas }) => gasUsage + Number(gas), 0);

      return totalGas + contractGasUsage;
    }, 0);

  const [jsonStart, jsonEnd] = [testOutput?.indexOf('{') || -1, testOutput?.lastIndexOf('}') || -1]; // Start and end of the JSON

  const unprocessedTestExecutionResults = JSON.parse(testOutput?.substring(jsonStart, jsonEnd + 1) || '{}');
  const processedTestExecutionResults = getProcessedTestExecutionResults(unprocessedTestExecutionResults);

  const numPassed = getStatusCount(processedTestExecutionResults, 'Success');
  const numFailed = getStatusCount(processedTestExecutionResults, 'Failure');

  return {
    overall: {
      passed: !!numPassed && !numFailed,
      numPassed,
      numFailed,
      totalGas: getTotalGasUsage(processedTestExecutionResults)
    },
    tests: processedTestExecutionResults
  };
};

/**
 * Removes ANSI color codes from a string.
 *
 * @param {string} str - The input string containing color codes.
 * @returns {string} A new string with color codes removed.
 */
const removeColorCodes = (str: string): string => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

/**
 * Extracts gas difference analysis from test output.
 *
 * @param {string | undefined} testOutput - The test output text.
 * @returns {DockerContainerExecutionOutput} An object containing the extracted gas difference analysis.
 */
const extractGasDiffAnalysisFromExecutionOutput = (
  testOutput: string | undefined
): DockerContainerExecutionOutput => {
  const extractGasDiffNumbersFromGasParts = (
    gasParts: string | undefined
  ): { gasDiff: number, gasDiffPercentage: number } => {
    const gasPartsSplit = gasParts?.split(' ');
    let [gasDiff, gasDiffPercentage] = [-1, -1];

    if (gasPartsSplit && gasPartsSplit.length > 1) {
      gasDiff = parseInt(gasPartsSplit[0], 10);
      gasDiffPercentage = parseFloat(gasPartsSplit[1].replace('(', '').replace('%)', ''));
    }

    return { gasDiff, gasDiffPercentage };
  };

  const jsonEnd = testOutput?.lastIndexOf('}') || -1; // End of the JSON
  const lines = testOutput?.substring(jsonEnd + 1).trim().split('\n').map(removeColorCodes) || [];

  // Overall gas diff
  const [overallGasDiffLine] = lines.slice(-1);
  const [, overallGasDiffParts] = overallGasDiffLine
    ? overallGasDiffLine.split('Overall gas change: ')
    : [undefined, undefined];
  const {
    gasDiff: overallGasDiff, gasDiffPercentage: overallGasDiffPercentage
  } = extractGasDiffNumbersFromGasParts(overallGasDiffParts);

  // Gas diff for each test
  const testGasDiffLines = lines.slice(0, -1);
  const testGasDiffs = testGasDiffLines.map((line) => {
    const [testName, gasParts] = line.split(' (gas: ');
    const { gasDiff, gasDiffPercentage } = extractGasDiffNumbersFromGasParts(gasParts);

    return { test: testName.trim(), gasDiff, gasDiffPercentage };
  });

  return {
    gasDiffAnalysis: { overallGasDiff, overallGasDiffPercentage, testGasDiffs } as GasDiffAnalysis
  } as DockerContainerExecutionOutput;
};

export default {
  getTestExecutionCommand,
  getGasSnapshotRetrievalCommand,
  retrieveTestNamesFromGasSnapshot,
  extractTestExecutionResultsFromExecutionOutput,
  extractGasDiffAnalysisFromExecutionOutput
};