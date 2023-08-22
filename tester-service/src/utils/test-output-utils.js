const getNumTests = (node, weight=0, leafNodeCount=0) => {
  for (const key in node) {
    if (!Object.keys(node[key]).length) {
      leafNodeCount++;
    } else {
      leafNodeCount = getNumTests(node[key], weight, leafNodeCount);
    }
  }

  return leafNodeCount;
}

const setTestWeights = (node, weight) => {
  for (const key in node) {
    if (!Object.keys(node[key]).length) {
      node[key] = weight;
    } else {
      setTestWeights(node[key], weight);
    }
  }
}

function getLeafNodes(obj) {
  const leafNodes = [];

  function traverse(node, path) {
    for (const key in node) {
      if (Object.keys(node[key]).length === 0) {
        leafNodes.push([...path, key].join("/"));
      } else {
        traverse(node[key], [...path, key]);
      }
    }
  }

  traverse(obj, []);
  return leafNodes;
}

const convertTestListOutputToJson = (testListOutput) => {
  // Convert the text output to json output
  const lines = testListOutput.trim().split('\n');
  const testObject = {};
  
  let currentPath = [];
  let currentObject = testObject;

  for (const line of lines) {
    const indentationLevel = (line.match(/^\s*/)[0]).length / 2;
    let name = line.trim();
  
    if (!indentationLevel) {
      const parts = line.split("/");
      const lastPart = parts[parts.length - 1];
  
      if (line.includes(".t.sol")) {
        name = lastPart.substring(0, lastPart.indexOf(".t.sol"));
      } else if (line.includes(".sol")) {
        name = lastPart.substring(0, lastPart.indexOf(".sol"));
      } else {
        continue;
      }
    }
  
    while (currentPath.length > indentationLevel) {
      currentPath.pop();
      currentObject = currentPath.reduce((obj, key) => obj[key], testObject);
    }
  
    currentPath = currentPath.slice(0, indentationLevel);
    currentPath.push(name);
  
    currentObject[name] = {};
    currentObject = currentObject[name];
  }

  // Get the leaf nodes as concatenated strings (these are the test names)
  const testNames = getLeafNodes(testObject)
  return testNames;
}

module.exports = { convertTestListOutputToJson };

console.log(convertTestListOutputToJson(`
[⠒] Compiling...
[⠒] Compiling 26 files with 0.8.20
[⠘] Solc 0.8.20 finished in 2.44s
Compiler run successful!
test/BBSEBank.t.sol
  BBSEBankTest_FailureScenarios
    testFail_1_RevertWhen_YearlyReturnRateIsInvalid
    testFail_2_RevertWhen_NonOwnerUpdatedYearlyReturnRate
    testFail_3_RevertWhen_DepositAmountProvidedIsInvalid
    testFail_4_RevertWhen_BorrowingMoreEtherThanBankHas
    testFail_5_RevertWhen_PayingLoanWithInvalidLoanAmount
    testFail_6_RevertWhen_ThereAreMultipleActiveDeposits
    testFail_7_RevertWhen_WithdrawingWithNoActiveDeposit
    testFail_8_RevertWhen_ThereAreMultipleActiveLoans
    testFail_9_RevertWhen_PayingLoanWithNoActiveLoan

  BBSEBankTest_SuccessScenarios
    test_1_SucceedIf_YearlyReturnRateIsSetCorrectly
    test_2_SucceedIf_YearlyReturnRateIsUpdatedCorrectly
    test_3_SucceedIf_DepositSucceeds
    test_4_SucceedIf_WithdrawalSucceeds
    test_5_SucceedIf_BorrowingSucceeds
    test_6_SucceedIf_PayingLoanSucceeds

test/BBSEToken.t.sol
  BBSETokenTest_FailureScenarios
    test_1_RevertWhen_NonMinterPassesMinterRole
    test_2_RevertWhen_NonMinterMintsTokens

  BBSETokenTest_SuccessScenarios
    test_1_SucceedIf_TokenNameIsSetCorrectly
    test_2_SucceedIf_TokenSymbolIsSetCorrectly
    test_3_SucceedIf_MinterIsSetCorrectly
    test_4_SucceedIf_MinterRoleIsPassedCorrectly
    test_5_SucceedIf_TokensAreMintedCorrectly

test/Oracle.t.sol
  ETHBBSEPriceFeedOracleTest_FailureScenarios
    testFail_1_RevertWhen_NonOwnerUpdatesRate
    testFail_2_RevertWhen_GetNewRateEventIsExpectedAlthoughMaxPriceAgeIsNotReached

  ETHBBSEPriceFeedOracleTest_SuccessScenarios
    test_1_SucceedIf_RateAndLastUpdateBlockAreInitializedCorrectly
    test_2_SucceedIf_RateIsUpdatedCorrectly
    test_3_SucceedIf_GetNewRateEventIsEmittedWhenMaxPriceAgeIsReached

`));
