const mongoose = require("mongoose");

const Execution = require("../models/execution");
const StatusEnum = require("../models/enums/status-enum");

const projectController = require("./project-controller");

const logger = require("../utils/logger-utils");
const constantUtils = require("../utils/constant-utils");
const fsUtils = require("../utils/fs-utils");
const dockerUtils = require("../utils/docker-utils");
const testOutputUtils = require("../utils/test-output-utils");
const HTTPError = require("../errors/http-error");

const runDockerContainer = async (projectName, zipBuffer) => {
  // Save the current execution and attach it to the project
  const project = await projectController.findProjectByName(projectName, ["_id"]);
  const execution = new Execution({ project: project._id });

  // Read the source files from the zip buffer
  const [tempSrcDirPath, executionContents] = await fsUtils.readFromZipBuffer(`${projectName}_execution_${execution._id}`, zipBuffer);

  try {
    // Run the Docker container to execute the tests
    const [dockerContainerName, testOutput, elapsedTimeMs] = await dockerUtils.runDockerContainer(
      projectName, constantUtils.FORGE_COMMANDS.COMPARE_SNAPSHOTS, tempSrcDirPath
    ).finally(async () => {
      await fsUtils.removeDirectory(tempSrcDirPath); // Remove the temp directory after creating the image
    });

    // Extract the test execution results from the test output
    const testExecutionResults = {
      executionTimeMs: elapsedTimeMs,
      ...testOutputUtils.extractTestExecutionResults(testOutput),
      ...testOutputUtils.extractGasDiffAnalysis(testOutput)
    };

    // Update the execution fields
    execution.status = testExecutionResults.overall.passed ? StatusEnum.SUCCESS : StatusEnum.FAILURE;
    execution.dockerContainerName = dockerContainerName;
    execution.contents = executionContents;
    execution.results = testExecutionResults;
  } catch (err) {
    logger.warn(`Test execution for the project '${projectName}' has failed (execution=${execution._id})!`);
  } finally {
    // Save the execution
    return await execution.save();
  }
};

const getExecutionFilesInZipBuffer = async (executionId) => {
  const execution = await Execution.findById(new mongoose.Types.ObjectId(executionId)).select("contents");
  if (!execution) {
    throw new HTTPError(404, `Execution with ID=${executionId} not found!`);
  }

  return fsUtils.writeStringifiedContentsToZipBuffer(`Execution ${executionId}`, execution.contents);
};

module.exports = { runDockerContainer, getExecutionFilesInZipBuffer };
