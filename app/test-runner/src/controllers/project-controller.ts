import type { IDockerImage } from '@models/docker-image';
import DockerContainerHistory from '@models/docker-container-history';
import type { DockerContainerExecutionOutput } from '@models/docker-container-history';

import Status from '@models/enums/status';
import Logger from '@logging/logger';

import dockerImageService from '@services/docker-image-service';

import constantUtils from '@utils/constant-utils';
import errorUtils from '@utils/error-utils';
import fsUtils from '@utils/fs-utils';
import dockerUtils from '@utils/docker-utils';
import testOutputUtils from '@utils/test-output-utils';

/**
 * Extracts test names from execution output based on the status.
 *
 * @param {DockerContainerExecutionOutput | undefined} output - The execution output
 * @returns {DockerContainerExecutionOutput} An array of test names
 */
const extractTestsFromExecutionOutput = (
  output: DockerContainerExecutionOutput | undefined
): DockerContainerExecutionOutput => {
  if (output?.data) {
    return { tests: testOutputUtils.extractTestNamesFromGasSnapshot(output?.data) };
  }

  return { data: 'No execution data found!' };
};

/**
 * Creates a new project with the given name from a ZIP buffer.
 *
 * @param {string} projectName - The name of the new project.
 * @param {Buffer} zipBuffer - The ZIP buffer containing the project files.
 * @returns {Promise<{ image: IDockerImage, output: DockerContainerExecutionOutput | undefined }>} A promise that resolves to an object containing the created Docker image and the extracted test names.
 * @throws {Error} If any error occurs during project creation.
 */
const createNewProject = async (
  projectName: string, zipBuffer: Buffer
): Promise<{ image: IDockerImage, output: DockerContainerExecutionOutput | undefined }> => {
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
      .finally(() => fsUtils.removeDirectorySync(tempProjectDirPath)); // Remove the temp directory after creating the image

    // Run the Docker container to get the gas snapshot file
    const commandExecuted = `cat ${constantUtils.PROJECT_FILES.GAS_SNAPSHOT}`;
    const dockerContainerHistory = await dockerUtils.runImage(
      execName, dockerImage.imageName, new DockerContainerHistory({ commandExecuted }));

    // Retrieve the names of the tests from the gas snapshot output (if the execution has been successful) and update the Docker container history with the execution results
    try {
      if (dockerContainerHistory.status === Status.SUCCESS) {
        dockerContainerHistory.output = extractTestsFromExecutionOutput(dockerContainerHistory.output);
      }
    } catch (err: Error | unknown) {
      const errMessage = (err as Error)?.message;
      throw new Error(`An error occurred while extracting the test results from the executed Docker container created from the image '${dockerImage.imageName}'. (Error: ${errMessage}})`);
    }

    // Save (or update it if it already exists) the Docker image with the Docker container history for the executed container
    return await dockerImageService.upsertWithDockerContainerHistory(dockerImage, dockerContainerHistory)
      .then(({ dockerImageSaved, dockerContainerHistorySaved }) => {
        Logger.info(`Created the ${projectName} project with the Docker image (${dockerImage.imageID}).`);
        return { image: dockerImageSaved, output: dockerContainerHistorySaved.output };
      });
  } catch (err: Error | unknown) {
    throw errorUtils.getErrorWithoutDetails(`An error occurred while creating the ${projectName} project.`, err);
  }
};

export default { createNewProject };
