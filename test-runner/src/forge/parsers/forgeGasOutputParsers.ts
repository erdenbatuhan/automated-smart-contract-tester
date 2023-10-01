import type ForgeGasChangeOutput from '@forge/types/ForgeGasChange';

import forgeCommonParsers from '@forge/parsers/forgeCommonParsers';

const GAS_CHANGE_PREFIX_OVERALL = 'Overall gas change: '; // Prefix for overall gas change output
const GAS_CHANGE_PREFIX = ' (gas: '; // Prefix for individual gas change output

/**
 * Parses a string to a float and returns null if NaN.
 *
 * @param {string} numberStr - The number string to parse.
 * @returns {number | null} Parsed number or null if NaN.
 */
const parseFloatWithoutNaN = (numberStr: string): number | null => {
  const numValue = parseFloat(numberStr);
  return !Number.isNaN(numValue) ? numValue : null;
};

/**
 * Extracts gas change data from Forge test execution output.
 *
 * @param {string | undefined | null} forgeTestExecutionOutput - The Forge test execution output.
 * @returns {ForgeGasChangeOutput} Parsed gas change data.
 */
const extractGasChangeFromForgeTestExecutionOutput = (
  forgeTestExecutionOutput: string | undefined | null
): ForgeGasChangeOutput => {
  const jsonEnd = forgeTestExecutionOutput?.lastIndexOf('}') || -1; // End of the JSON
  const forgeGasChangeOutput = forgeCommonParsers.removeColorCodes(forgeTestExecutionOutput?.substring(jsonEnd + 1).trim() || '');
  const forgeGasChangeLines = forgeGasChangeOutput.split('\n');

  return forgeGasChangeLines.reduce((gasChangeResultsProcessed, forgeGasChangeLine) => {
    const isOverall = forgeGasChangeLine.includes(GAS_CHANGE_PREFIX_OVERALL);
    let testName, gasChangePartsString;

    if (isOverall) { // Overall
      [, gasChangePartsString] = forgeGasChangeLine.split(GAS_CHANGE_PREFIX_OVERALL);
    } else { // Test
      [testName, gasChangePartsString] = forgeGasChangeLine.split(GAS_CHANGE_PREFIX);
      testName = forgeCommonParsers.parseTestName(testName); // Remove the parentheses '()' from the test name.
    }

    const gasChangeParts = gasChangePartsString?.split(' ');
    let gasChange = null, gasChangePercentage = null;

    if (gasChangeParts && gasChangeParts.length > 1) {
      gasChange = parseFloatWithoutNaN(gasChangeParts[0]);
      gasChangePercentage = parseFloatWithoutNaN(gasChangeParts[1].replace('(', '').replace('%)', ''));
    }

    if (isOverall) {
      gasChangeResultsProcessed.overall = { totalGasChange: gasChange, totalGasChangePercentage: gasChangePercentage };
    } else if (testName) {
      gasChangeResultsProcessed.tests[testName] = { gasChange, gasChangePercentage };
    }

    return gasChangeResultsProcessed;
  }, {
    overall: { totalGasChange: null, totalGasChangePercentage: null },
    tests: {}
  } as ForgeGasChangeOutput);
};

export default {
  extractGasChangeFromForgeTestExecutionOutput
};
