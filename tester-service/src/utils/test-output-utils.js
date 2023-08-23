function getTestNames(testListJSON) {
  const testNames = [];

  function traverseTestListJSON(node, path=[]) {
    for (const key in node) {
      if (typeof node[key] === "object") {
        traverseTestListJSON(node[key], [...path, key]);
      } else {
        testNames.push({
          "testName": node[key],
          "fullTestName": `${[...path, key].join("/")}/${node[key]}`
        });
      }
    }
  }

  traverseTestListJSON(testListJSON);
  return testNames;
}

const extractTestNamesFromTestListOutput = (testListOutput) => {
  try {
    const startIndex = testListOutput.indexOf("{"); // Find the index of the opening curly brace that starts the JSON data
    const testListJSON = JSON.parse(testListOutput.slice(startIndex));

    return getTestNames(testListJSON) // Return only the name of the tests
  } catch (err) {
    throw new Error(`Could not convert test list output to JSON! (Error: ${err})`);
  }
}

module.exports = { extractTestNamesFromTestListOutput };
