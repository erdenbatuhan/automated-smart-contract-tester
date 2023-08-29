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
}

module.exports = { getTestNamesFromGasSnapshot };
