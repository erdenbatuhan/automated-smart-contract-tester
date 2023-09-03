const dockerImageService = require('../services/docker-image-service');

const Status = require('../models/enums/status');
const Logger = require('../logging/logger');

const constantUtils = require('../utils/constant-utils');
const errorUtils = require('../utils/error-utils');
const fsUtils = require('../utils/fs-utils');
const dockerUtils = require('../utils/docker-utils');
const testOutputUtils = require('../utils/test-output-utils');

const extractTestsFromExecutionOutput = ({ status, output }) => ((status === Status.SUCCESS)
  ? testOutputUtils.extractTestNamesFromGasSnapshot(output)
  : output);

const createNewProject = async (projectName, zipBuffer) => {
  try {
    Logger.info(`Creating the ${projectName} project.`);
    const execName = `${projectName}_creation_${Date.now()}`;

    // Read the project from the zip buffer
    const tempProjectDirPath = await fsUtils.readFromZipBuffer(
      execName,
      zipBuffer,
      { requiredFiles: constantUtils.REQUIRED_FILES, requiredFolders: constantUtils.REQUIRED_FOLDERS },
      [constantUtils.PATH_PROJECT_TEMPLATE]
    );

    // Create a docker image from the project read from zip buffer
    const dockerImage = await dockerUtils.createImage(projectName, tempProjectDirPath)
      .finally(() => { fsUtils.removeDirectorySync(tempProjectDirPath); }); // Remove the temp directory after creating the image

    // Run the Docker container to get the gas snapshot file
    const dockerContainerExecutionInfo = await dockerUtils.runContainer(
      execName, projectName, `cat ${constantUtils.PROJECT_FILES.GAS_SNAPSHOT}`);

    // Retrieve the names of the tests from the gas snapshot output and update the Docker container execution output
    dockerContainerExecutionInfo.output = extractTestsFromExecutionOutput(dockerContainerExecutionInfo);

    // Save (or update it if it already exists) the docker image with the docker container history for the executed container
    return await dockerImageService.upsertWithDockerContainerHistory(dockerImage, dockerContainerExecutionInfo)
      .then(({ dockerImageSaved, dockerContainerHistorySaved }) => {
        Logger.info(`Created the ${projectName} project with the docker image (${dockerImage.imageID}).`);
        return { image: dockerImageSaved, output: dockerContainerHistorySaved.output };
      });
  } catch (err) {
    throw errorUtils.getErrorWithoutDetails(`An error occurred while creating the ${projectName} project!`, err);
  }
};

module.exports = { createNewProject };
