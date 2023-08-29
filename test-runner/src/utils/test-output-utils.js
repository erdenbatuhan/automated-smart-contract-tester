const getTestNamesFromGasSnapshot = (gasSnapshotText) => {
  const testNames = [];

  gasSnapshotText.split("\n").forEach(line => {
    const match = line.match(/^([^()]+)/); // Use regex to extract text before ()

    if (match) {
      const testName = match[1].trim();
      testNames.push(testName);
    }
  });

  // Return test names with weights (initially set to 1.0)
  return testNames.map(testName => ({ test: testName, weight: 1.0 }));
}

module.exports = { getTestNamesFromGasSnapshot };
