// Regular expression that matches ANSI color codes
const REGEX_COLOR_CODES: RegExp = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/**
 * Removes ANSI color codes from a string.
 *
 * @param {string | undefined} str - The input string containing color codes.
 * @returns {string} A new string with color codes removed.
 */
const removeColorCodes = (str: string | undefined): string => (str ? str.replace(REGEX_COLOR_CODES, '') : '');

/**
 * Removes the file name from the contract name.
 *
 * @param {string} contractName - The full contract name, including file name and contract name.
 * @returns {string} The extracted contract name.
 */
const parseContractName = (contractName: string): string => contractName.split(':')[1];

/**
 * Trims the test name and removes the parentheses '()' from it.
 *
 * @param {string} testName - The test function name, including parentheses.
 * @returns {string} The extracted test name.
 */
const parseTestName = (testName: string): string => testName.trim().split('()')[0];

export default {
  removeColorCodes,
  parseContractName,
  parseTestName
};
