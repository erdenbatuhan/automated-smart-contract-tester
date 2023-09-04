const dockerImageService = require('../services/docker-image-service');
const dockerContainerHistoryService = require('../services/docker-container-history-service');

const Status = require('../models/enums/status');
const Logger = require('../logging/logger');
const HTTPError = require('../errors/http-error');

const constantUtils = require('../utils/constant-utils');
const errorUtils = require('../utils/error-utils');
const fsUtils = require('../utils/fs-utils');
const dockerUtils = require('../utils/docker-utils');
const testOutputUtils = require('../utils/test-output-utils');

const findDockerImageByName = async (imageName) => dockerImageService.findByName(imageName).catch((err) => {
  if (err instanceof HTTPError) {
    Logger.error(err.message);
    throw err;
  }

  throw errorUtils.getErrorWithoutDetails(`An error occurred while finding the docker image with the name=${imageName}!`, err);
});

const extractTestResultsFromExecutionOutput = ({ status, output }) => ((status === Status.SUCCESS)
  ? { ...testOutputUtils.extractTestExecutionResults(output), ...testOutputUtils.extractGasDiffAnalysis(output) }
  : output);

const executeTests = async (imageName, zipBuffer) => {
  const commandExecuted = constantUtils.FORGE_COMMANDS.COMPARE_SNAPSHOTS;
  const dockerImage = await findDockerImageByName(imageName);
  let dockerContainerHistory = dockerContainerHistoryService.create(dockerImage, { commandExecuted });

  try {
    Logger.info(`Running the tests using the following command in the ${imageName} image: ${commandExecuted}.`);
    const execName = `${imageName}_execution_${dockerContainerHistory._id}_${Date.now()}`;

    // Read the source files from the zip buffer
    const tempSrcDirPath = await fsUtils.readFromZipBuffer(execName, zipBuffer);

    // Run the Docker container to execute the tests
    const dockerContainerExecutionInfo = await dockerUtils.runContainer(
      execName, imageName, commandExecuted, tempSrcDirPath
    ).finally(() => { fsUtils.removeDirectorySync(tempSrcDirPath); }); // Remove the temp directory after creating the image

    // Extract the test execution results from the test output and update the Docker container execution output
    dockerContainerExecutionInfo.output = extractTestResultsFromExecutionOutput(dockerContainerExecutionInfo);

    // Update the Docker container history with the execution results
    Logger.info(`Executed the tests with the command '${commandExecuted}' in the ${imageName} image.`);
    dockerContainerHistory = dockerContainerHistoryService.create(dockerImage, dockerContainerExecutionInfo);
  } catch (err) {
    const errMessage = err && err.message;

    Logger.warn(`Failed to execute the tests with the command '${commandExecuted}' in the ${imageName} image! (Error: ${errMessage})`);
    dockerContainerHistory.output = { error: errMessage };
  }

  return dockerContainerHistoryService.save(dockerContainerHistory).then((dockerContainerHistorySaved) => {
    Logger.info(`Execution history for the Docker container created from the image '${imageName}' has been successfully saved.`);
    return dockerContainerHistorySaved;
  }).catch((err) => {
    throw errorUtils.getErrorWithoutDetails(`Failed to save execution history for the Docker container created from the image '${imageName}'!`, err);
  });
};

module.exports = { executeTests };
