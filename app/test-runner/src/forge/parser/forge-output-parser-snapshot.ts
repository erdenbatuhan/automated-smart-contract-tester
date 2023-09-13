import type TestOutput from '@forge/types/forge-test-output';

/**
 * Regular expression pattern to match a gas snapshot line.
 * @example
 * - "BBSEBankTest_FailureScenarios:testFail_1_RevertWhen_YearlyReturnRateIsInvalid() (gas: 61894)"
 */
const REGEX_GAS_SNAPSHOT: RegExp = /^(.+?):(.+?)\(\) \(gas: (\d+)\)/;

/**
 * Extracts test output data from gas snapshot text.
 *
 * @param {string | undefined | null} gasSnapshotText - The gas snapshot output returned by Forge.
 * @returns {TestOutput} The extracted test output data.
 */
const extractTestOutputFromGasSnapshot = (gasSnapshotText: string | undefined | null): TestOutput => {
  const contracts: { [name: string]: boolean } = {}; // To calculate the total number of contracts
  const tests: TestOutput['tests'] = [];
  let totalGas = 0;

  gasSnapshotText?.split('\n').forEach((line) => {
    const match = line.match(REGEX_GAS_SNAPSHOT);
    if (!match) return;

    const [, contractName, testName, gasString] = match;
    const gasNumber = parseFloat(gasString) || null;

    contracts[contractName] = true;
    tests.push({ contract: contractName, test: testName, gas: gasNumber });
    totalGas += gasNumber || 0;
  });

  return {
    overall: {
      numContracts: Object.keys(contracts).length,
      numTests: tests.length,
      totalGas: totalGas || null
    },
    tests
  };
};

export default {
  extractTestOutputFromGasSnapshot
};
