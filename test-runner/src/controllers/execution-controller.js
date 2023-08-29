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
  const execution = await new Execution({ project: project._id }).save();

  try {
    // Read the source files from the zip buffer
    const [tempSrcDirPath, executionContents] = await fsUtils.readFromZipBuffer(`${projectName}_execution_${execution._id}`, zipBuffer);

    // Run the Docker container to execute the tests and get the execution results
    const [dockerContainerName, testOutput] = await dockerUtils.runDockerContainer(
      projectName, constantUtils.FORGE_COMMANDS.COMPARE_SNAPSHOTS, tempSrcDirPath
    ).finally(async () => {
      await fsUtils.removeDirectory(tempSrcDirPath); // Remove the temp directory after creating the image
    });
    const testExecutionResults = testOutputUtils.getTestExecutionResults(testOutput);

    // Update the execution
    return await Execution.findOneAndReplace(
      { _id: execution._id },
      { project: project._id, status: StatusEnum.SUCCESS, dockerContainerName, contents: executionContents, results: testExecutionResults },
      { new: true }
    )
  } catch (err) {
    logger.warn(`Test execution for the project '${projectName}' has failed (execution=${execution._id})!`);
    return execution;
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
