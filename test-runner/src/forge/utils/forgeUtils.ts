import Constants from '@Constants';

import type { IDockerContainerResults } from '@models/schemas/DockerContainerResultsSchema';
import type { ITestOutput } from '@models/schemas/ForgeTestOutputSchema';
import DockerExitCode from '@models/enums/DockerExitCode';

import type TestOutput from '@forge/types/ForgeTestOutput';
import ForgeTestExecutionArgument from '@forge/types/enums/ForgeTestExecutionArgument';

import forgeCommonParsers from '@forge/parsers/forgeCommonParsers';
import forgeSnapshotOutputParsers from '@forge/parsers/forgeSnapshotOutputParsers';
import forgeTestOutputParsers from '@forge/parsers/forgeTestOutputParsers';
import forgeGasOutputParsers from '@forge/parsers/forgeGasOutputParsers';

const VALID_TEST_EXECUTION_ARGUMENTS = Object.values(ForgeTestExecutionArgument).map((val) => val.toString());

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
 * @param {object} [execArgs] - Optional execution arguments to be included in the command.
 * @returns {string} The test execution command with execution arguments (if provided).
 */
const getTestExecutionCommand = (execArgs?: object): string => {
  const executionArgsString = convertTestExecutionArgsToString(execArgs);
  let executionCommand = Constants.FORGE_CMD_COMPARE_SNAPSHOTS;

  if (executionArgsString) {
    executionCommand = `${executionCommand} ${executionArgsString}`;
  }

  return executionCommand;
};

/**
 * Process Forge snapshot output by extracting test output from gas snapshot.
 *
 * @param {string | undefined | null} gasSnapshotText - The Forge gas snapshot text.
 * @returns {TestOutput} The processed test output extracted from the gas snapshot.
 */
const processForgeSnapshotOutput = (gasSnapshotText: string | undefined | null): TestOutput => forgeSnapshotOutputParsers
  .extractTestOutputFromGasSnapshot(gasSnapshotText);

/**
 * Process Forge test output by combining test results and gas change information.
 *
 * @param {IDockerContainerResults} containerResults - The results of the container execution.
 * @returns {TestOutput} The processed test output, including test results and gas change information.
 */
const processForgeTestOutput = (containerResults: IDockerContainerResults): ITestOutput => {
  // Extract and process test execution results from the container output only when the execution has exited with a non-error code
  if (containerResults.statusCode !== DockerExitCode.PURPOSELY_STOPPED) {
    return { error: forgeCommonParsers.removeColorCodes(containerResults.output.error) };
  }

  // Extract test results & gas change information from Forge test execution output
  const testOutput = forgeTestOutputParsers.extractTestResultsFromForgeTestExecutionOutput(containerResults.output?.data);
  const gasChangeOutput = forgeGasOutputParsers.extractGasChangeFromForgeTestExecutionOutput(containerResults.output?.data);

  // Merge test result and gas change values into a new object
  return {
    overall: { ...testOutput.overall, ...gasChangeOutput.overall },
    tests: testOutput.tests?.map((result) => ({ ...result, ...(gasChangeOutput.tests[result.test] || {}) }))
  } as TestOutput;
};

export default {
  getTestExecutionCommand,
  processForgeSnapshotOutput,
  processForgeTestOutput
};
