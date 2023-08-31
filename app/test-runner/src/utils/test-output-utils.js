const removeColorCodes = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");

const extractTestNamesFromGasSnapshot = (gasSnapshotText) => {
  const testNames = [];

  gasSnapshotText.split("\n").forEach(line => {
    const match = line.match(/^([^()]+)/); // Use regex to extract text before ()

    if (match) {
      const testName = match[1].trim();
      testNames.push(testName);
    }
  });

  return testNames;
};

const extractTestExecutionResults = (testOutput) => {
  const processTestExecutionResults = (unprocessedTestExecutionResults) => {
    const processedTestExecutionResults = {};

    for (const [key, value] of Object.entries(unprocessedTestExecutionResults)) {
      if (key === "duration" || key === "counterexample" || key === "logs" || key === "traces" || key === "warning") {
        continue;
      }

      if (key === "decoded_logs") {
        processedTestExecutionResults["logs"] = value.join("\n");
      } else if (key === "kind") {
        processedTestExecutionResults["gas"] = value["Standard"];
      } else if (typeof value === "object" && value !== null) {
        processedTestExecutionResults[key] = processTestExecutionResults(value);
      } else {
        processedTestExecutionResults[key] = value;
      }
    }

    return processedTestExecutionResults;
  }

  const countPassingStatus = (data, status) => {
    return Object.values(data).reduce((count, value) => {
      if (value.hasOwnProperty("test_results")) {
        const testResults = Object.values(value.test_results);
        const statusCount = testResults.filter(test => test.status === status).length;

        return count + statusCount;
      } else if (typeof value === "object") {
        return count + countPassingStatus(value, status);
      }

      return count;
    }, 0);
  };

  const [jsonStart, jsonEnd] = [testOutput.indexOf("{"), testOutput.lastIndexOf("}")]; // Start and end of the JSON

  const unprocessedTestExecutionResults = JSON.parse(testOutput.substring(jsonStart, jsonEnd + 1));
  const processedTestExecutionResults = processTestExecutionResults(unprocessedTestExecutionResults);

  const [numPassed, numFailed] = [countPassingStatus(processedTestExecutionResults, "Success"), countPassingStatus(processedTestExecutionResults, "Failure")];

  return { overall: { passed: !numFailed, numPassed, numFailed }, tests: processedTestExecutionResults };
};

const extractGasDiffAnalysis = (testOutput) => {
  const extractGasDiffNumbersFromGasParts = (gasParts) => {
    const [gasDiff, gasDiffPercentage] = gasParts.split(" ");
    return [parseInt(gasDiff), parseFloat(gasDiffPercentage.replace("(", "").replace("%)", ""))];
  };

  const jsonEnd = testOutput.lastIndexOf("}"); // End of the JSON
  const lines = testOutput.substring(jsonEnd + 1).trim().split("\n").map(removeColorCodes);

  // Overall gas diff
  const [overallGasDiffLine] = lines.slice(-1);
  const [_, overallGasDiffParts] = overallGasDiffLine.split("Overall gas change: ")
  const [overallGasDiff, overallGasDiffPercentage] = extractGasDiffNumbersFromGasParts(overallGasDiffParts);

  // Gas diff for each test
  const testGasDiffLines = lines.slice(0, -1);
  const testGasDiffs = testGasDiffLines.map(line => {
    const [testName, gasParts] = line.split(" (gas: ");
    const [gasDiff, gasDiffPercentage] = extractGasDiffNumbersFromGasParts(gasParts);

    return { testName: testName.trim(), gasDiff, gasDiffPercentage };
  });

  return { gasDiffAnalysis: { overallGasDiff, overallGasDiffPercentage, testGasDiffs } };
};

module.exports = { extractTestNamesFromGasSnapshot, extractTestExecutionResults, extractGasDiffAnalysis };
