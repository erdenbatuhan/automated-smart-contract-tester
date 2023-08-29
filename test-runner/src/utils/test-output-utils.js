const removeColorCodes = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");

const getTestNamesFromGasSnapshot = (gasSnapshotText) => {
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

const getTestExecutionResults = (testOutput) => {
  const extractGasDiffNumbers = (gasParts) => {
    const [gasDiff, gasDiffPercentage] = gasParts.split(" ");
    return [parseInt(gasDiff), parseFloat(gasDiffPercentage.replace("(", "").replace("%)", ""))];
  };

  return {
    testResults: (() => {
      const jsonStart = testOutput.indexOf("{"); // Start of the first "{"
      const jsonEnd = testOutput.lastIndexOf("}"); // End of the last "}"
      const jsonContent = testOutput.substring(jsonStart, jsonEnd + 1);
  
      return JSON.parse(jsonContent);
    })(),
    gasDiffAnalysis: (() => {
      const jsonEnd = testOutput.lastIndexOf("}"); // End of the last "}"
      const lines = testOutput.substring(jsonEnd + 1).trim().split("\n").map(removeColorCodes);

      // Overall gas diff
      const [overallGasDiffLine] = lines.slice(-1);
      const [_, overallGasDiffParts] = overallGasDiffLine.split("Overall gas change: ")
      const [overallGasDiff, overallGasDiffPercentage] = extractGasDiffNumbers(overallGasDiffParts);
  
      // Gas diff for each test
      const testGasDiffLines = lines.slice(0, -1);
      const testGasDiffs = testGasDiffLines.map(line => {
        const [testName, gasParts] = line.split(" (gas: ");
        const [gasDiff, gasDiffPercentage] = extractGasDiffNumbers(gasParts);
  
        return { testName: testName.trim(), gasDiff, gasDiffPercentage };
      });
  
      return { overallGasDiff, overallGasDiffPercentage, testGasDiffs };
    })()
  };
};

module.exports = { getTestNamesFromGasSnapshot, getTestExecutionResults };
