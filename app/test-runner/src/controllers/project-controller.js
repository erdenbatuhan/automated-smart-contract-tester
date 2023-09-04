const Status = require('../models/enums/status');
const Logger = require('../logging/logger');

const dockerImageService = require('../services/docker-image-service');

const constantUtils = require('../utils/constant-utils');
const errorUtils = require('../utils/error-utils');
const fsUtils = require('../utils/fs-utils');
const dockerUtils = require('../utils/docker-utils');
const testOutputUtils = require('../utils/test-output-utils');

/**
 * Extracts test names from execution output based on the status.
 *
 * @param {{ status: import('../models/enums/status'), output: any }} param - An object containing the status and output.
 * @returns {string[]|any} An array of test names or the original output if the status is not SUCCESS.
 */
const extractTestsFromExecutionOutput = ({ status, output }) => ((status === Status.SUCCESS)
  ? testOutputUtils.extractTestNamesFromGasSnapshot(output)
  : output);

/**
 * Creates a new project with the given name from a ZIP buffer.
 *
 * @param {string} projectName - The name of the new project.
 * @param {Buffer} zipBuffer - The ZIP buffer containing the project files.
 * @returns {Promise<{ image: import('../models/docker-image'), output: string[]|any }>} A promise that resolves to an object containing the created Docker image and the extracted test names.
 * @throws {Error} If any error occurs during project creation.
 */
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

    // Create a Docker image from the project read from the zip buffer
    const dockerImage = await dockerUtils.createImage(projectName, tempProjectDirPath)
      .finally(() => { fsUtils.removeDirectorySync(tempProjectDirPath); }); // Remove the temp directory after creating the image

    // Run the Docker container to get the gas snapshot file
    const dockerContainerExecutionInfo = await dockerUtils.runContainer(
      execName, projectName, `cat ${constantUtils.PROJECT_FILES.GAS_SNAPSHOT}`);

    // Retrieve the names of the tests from the gas snapshot output and update the Docker container execution output
    dockerContainerExecutionInfo.output = extractTestsFromExecutionOutput(dockerContainerExecutionInfo);

    // Save (or update it if it already exists) the Docker image with the Docker container history for the executed container
    return await dockerImageService.upsertWithDockerContainerHistory(dockerImage, dockerContainerExecutionInfo)
      .then(({ dockerImageSaved, dockerContainerHistorySaved }) => {
        Logger.info(`Created the ${projectName} project with the Docker image (${dockerImage.imageID}).`);
        return { image: dockerImageSaved, output: dockerContainerHistorySaved.output };
      });
  } catch (err) {
    throw errorUtils.getErrorWithoutDetails(`An error occurred while creating the ${projectName} project!`, err);
  }
};

module.exports = { createNewProject };
