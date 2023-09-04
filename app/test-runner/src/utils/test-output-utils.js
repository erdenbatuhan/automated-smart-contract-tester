/**
 * Remove ANSI color codes from a string.
 *
 * @param {String} str - The input string containing color codes.
 * @returns {String} A new string with color codes removed.
 */
const removeColorCodes = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

/**
 * Extract test names from a gas snapshot text.
 *
 * @param {String} gasSnapshotText - The gas snapshot text to extract test names from.
 * @returns {String[]} An array of test names.
 */
const extractTestNamesFromGasSnapshot = (gasSnapshotText) => {
  const testNames = [];

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
 * @param {String} testOutput - The test output JSON string.
 * @returns {Object} An object containing the extracted test execution results.
 */
const extractTestExecutionResults = (testOutput) => {
  const processTestExecutionResults = (unprocessedTestExecutionResults) => {
    const processedTestExecutionResults = {};

    for (const [key, value] of Object.entries(unprocessedTestExecutionResults)) {
      if (key === 'decoded_logs') {
        processedTestExecutionResults.logs = value.join('\n');
      } else if (key === 'kind') {
        processedTestExecutionResults.gas = value.Standard;
      } else if (typeof value === 'object' && value !== null) {
        processedTestExecutionResults[key] = processTestExecutionResults(value);
      } else if (!['duration', 'counterexample', 'logs', 'traces', 'warning'].includes(key)) {
        processedTestExecutionResults[key] = value;
      }
    }

    return processedTestExecutionResults;
  };

  const countPassingStatus = (data, status) => Object.values(data).reduce((count, value) => {
    if (value.hasOwnProperty('test_results')) {
      const testResults = Object.values(value.test_results);
      const statusCount = testResults.filter((test) => test.status === status).length;

      return count + statusCount;
    } if (typeof value === 'object') {
      return count + countPassingStatus(value, status);
    }

    return count;
  }, 0);

  const [jsonStart, jsonEnd] = [testOutput.indexOf('{'), testOutput.lastIndexOf('}')]; // Start and end of the JSON

  const unprocessedTestExecutionResults = JSON.parse(testOutput.substring(jsonStart, jsonEnd + 1));
  const processedTestExecutionResults = processTestExecutionResults(unprocessedTestExecutionResults);

  const numPassed = countPassingStatus(processedTestExecutionResults, 'Success');
  const numFailed = countPassingStatus(processedTestExecutionResults, 'Failure');

  return { overall: { passed: !numFailed, numPassed, numFailed }, tests: processedTestExecutionResults };
};

/**
 * Extract gas difference analysis from test output.
 *
 * @param {String} testOutput - The test output text.
 * @returns {Object} An object containing the extracted gas difference analysis.
 */
const extractGasDiffAnalysis = (testOutput) => {
  const extractGasDiffNumbersFromGasParts = (gasParts) => {
    const [gasDiff, gasDiffPercentage] = gasParts.split(' ');
    return [parseInt(gasDiff, 10), parseFloat(gasDiffPercentage.replace('(', '').replace('%)', ''))];
  };

  const jsonEnd = testOutput.lastIndexOf('}'); // End of the JSON
  const lines = testOutput.substring(jsonEnd + 1).trim().split('\n').map(removeColorCodes);

  // Overall gas diff
  const [overallGasDiffLine] = lines.slice(-1);
  const [, overallGasDiffParts] = overallGasDiffLine.split('Overall gas change: ');
  const [overallGasDiff, overallGasDiffPercentage] = extractGasDiffNumbersFromGasParts(overallGasDiffParts);

  // Gas diff for each test
  const testGasDiffLines = lines.slice(0, -1);
  const testGasDiffs = testGasDiffLines.map((line) => {
    const [testName, gasParts] = line.split(' (gas: ');
    const [gasDiff, gasDiffPercentage] = extractGasDiffNumbersFromGasParts(gasParts);

    return { testName: testName.trim(), gasDiff, gasDiffPercentage };
  });

  return { gasDiffAnalysis: { overallGasDiff, overallGasDiffPercentage, testGasDiffs } };
};

module.exports = { extractTestNamesFromGasSnapshot, extractTestExecutionResults, extractGasDiffAnalysis };
