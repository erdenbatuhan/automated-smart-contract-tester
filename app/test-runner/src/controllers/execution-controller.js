const mongoose = require('mongoose');

const Execution = require('../models/execution');
const StatusEnum = require('../models/enums/status-enum');

const Logger = require('../logging/logger');
const HTTPError = require('../errors/http-error');

const projectController = require('./project-controller');

const constantUtils = require('../utils/constant-utils');
const errorUtils = require('../utils/error-utils');
const fsUtils = require('../utils/fs-utils');
const dockerUtils = require('../utils/docker-utils');
const testOutputUtils = require('../utils/test-output-utils');

const executeTests = async (projectName, zipBuffer) => {
  Logger.info(`Executing the tests for the project ${projectName}..`);
  let execution;

  try {
    // Save the current execution and attach it to the project
    const project = await projectController.findProjectByName(projectName, ['_id']);
    execution = new Execution({ project: project._id });

    // Read the source files from the zip buffer
    const contextName = `${projectName}_execution_${execution._id}`;
    const [tempSrcDirPath, executionContents] = await fsUtils.readFromZipBuffer(contextName, zipBuffer);

    try {
      // Run the Docker container to execute the tests
      const [dockerContainer, testOutput] = await dockerUtils.runContainer(
        projectName, constantUtils.FORGE_COMMANDS.COMPARE_SNAPSHOTS, tempSrcDirPath
      ).finally(() => {
        fsUtils.removeDirectorySync(tempSrcDirPath); // Remove the temp directory after creating the image
      });

      // Extract the test execution results from the test output
      const testExecutionResults = {
        executionTimeSeconds: dockerContainer.elapsedTimeSeconds,
        ...testOutputUtils.extractTestExecutionResults(testOutput),
        ...testOutputUtils.extractGasDiffAnalysis(testOutput)
      };

      // Update the execution fields
      execution.status = testExecutionResults.overall.passed ? StatusEnum.SUCCESS : StatusEnum.FAILURE;
      execution.dockerContainerName = dockerContainer.containerName;
      execution.contents = executionContents;
      execution.results = testExecutionResults;
    } catch (err) {
      Logger.warn(`Test execution for the project '${projectName}' has failed while running the docker container and extracting the results! `
        + `(execution=${execution._id}) (${err ? err.message : 'null'})`);
    }

    // Save the execution
    execution = await execution.save();
  } catch (err) {
    errorUtils.throwErrorWithoutDetails(`An error occurred while executing the tests for the project ${projectName}!`, err);
  }

  Logger.info(`Executed the tests for the project ${projectName}!`);
  return execution;
};

const getExecutionFilesInZipBuffer = async (executionId) => {
  let execution;
  try {
    execution = await Execution.findById(new mongoose.Types.ObjectId(executionId)).select('contents');
  } catch (err) {
    errorUtils.throwErrorWithoutDetails(`An error occurred while finding the execution with the ID=${executionId}!`, err);
  }

  if (!execution) {
    throw new HTTPError(404, `Execution with ID=${executionId} not found!`);
  }

  return fsUtils.writeStringifiedContentsToZipBuffer(`Execution ${executionId}`, execution.contents);
};

module.exports = { executeTests, getExecutionFilesInZipBuffer };
