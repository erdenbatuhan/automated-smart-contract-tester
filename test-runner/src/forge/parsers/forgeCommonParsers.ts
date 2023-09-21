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
  parseContractName,
  parseTestName
};
