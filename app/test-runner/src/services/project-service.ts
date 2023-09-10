import Logger from '@logging/logger';

import type { IDockerImage } from '@models/docker-image';
import DockerContainerHistory from '@models/docker-container-history';
import type { DockerContainerExecutionOutput } from '@models/docker-container-history';
import Status from '@models/enums/status';

import dockerImageService from '@services/docker-image-service';

import constantUtils from '@utils/constant-utils';
import errorUtils from '@utils/error-utils';
import fsUtils from '@utils/fs-utils';
import dockerUtils from '@utils/docker-utils';
import forgeUtils from '@utils/forge-utils';

/**
 * Retrieves the names of the tests from the gas snapshot output.
 *
 * @param {string} projectName - The name of the new project.
 * @param {DockerContainerExecutionOutput | undefined} output - The execution output.
 * @returns {{ tests: string[] }} An object containing the test names.
 * @throws {Error} If any error occurs while retrieving the names of the tests.
 */
const retrieveTestNamesFromGasSnapshot = (
  projectName: string, output: DockerContainerExecutionOutput | undefined
): { tests: string[] } => {
  try {
    return { tests: forgeUtils.retrieveTestNamesFromGasSnapshot(output?.data) };
  } catch (err: Error | unknown) {
    throw errorUtils.logAndGetError(err as Error, `An error occurred while retrieving the names of the tests for the ${projectName} project from the gas snapshot output.`);
  }
};

/**
 * Creates a new project or updates an existing one with the given name from a ZIP buffer.
 *
 * @param {string} projectName - The name of the project.
 * @param {Buffer} zipBuffer - The ZIP buffer containing the project files.
 * @returns {Promise<{ isNew: boolean; project: { image: IDockerImage; output: DockerContainerExecutionOutput | undefined } }>} A promise that resolves to an object containing the created Docker Image and the extracted test names.
 * @throws {Error} If any error occurs during project creation.
 */
const createOrUpdateProject = async (
  projectName: string, zipBuffer: Buffer
): Promise<{ isNew: boolean; project: { image: IDockerImage; output: DockerContainerExecutionOutput | undefined } }> => {
  let dockerImage: IDockerImage | null = null;

  try {
    Logger.info(`Creating the ${projectName} project.`);
    const execName = `${projectName}_creation_${Date.now()}`;

    // Read the project from the zip buffer
    const {
      dirPath: tempDirPath,
      extractedPath: tempProjectDirPath
    } = await fsUtils.readFromZipBuffer(
      execName,
      zipBuffer,
      { requiredFiles: constantUtils.REQUIRED_FILES, requiredFolders: constantUtils.REQUIRED_FOLDERS },
      [constantUtils.PATH_PROJECT_TEMPLATE]
    );

    // Create a Docker Image from the project read from the zip buffer
    dockerImage = await dockerUtils.createImage(projectName, tempProjectDirPath)
      .finally(() => fsUtils.removeDirectorySync(tempDirPath)); // Remove the temp directory after creating the image

    // Run the Docker container to get the gas snapshot file
    const dockerContainerHistory = await dockerUtils.runImage(
      execName, dockerImage!.imageName, new DockerContainerHistory({
        commandExecuted: forgeUtils.getGasSnapshotRetrievalCommand()
      }));

    // Retrieve the names of the tests from the gas snapshot output (if the execution has been successful) and update the Docker Container History with the execution results
    if (dockerContainerHistory.status === Status.SUCCESS) {
      dockerContainerHistory.output = retrieveTestNamesFromGasSnapshot(projectName, dockerContainerHistory.output);
    }

    // Save (or update it if it already exists) the Docker Image with the Docker Container History for the executed container
    return await dockerImageService.saveDockerImageWithDockerContainerHistory(dockerImage!, dockerContainerHistory)
      .then(({ isNew, dockerImageSaved, dockerContainerHistorySaved }) => {
        Logger.info(`Created the ${projectName} project with the Docker Image (${dockerImage!.imageID}).`);
        return { isNew, project: { image: dockerImageSaved, output: dockerContainerHistorySaved?.output } };
      });
  } catch (err: Error | unknown) {
    // If an error has occurred, remove the Docker image if it has been created
    if (dockerImage) {
      await dockerUtils.removeImage(dockerImage.imageName, { shouldPrune: true });
    }

    throw errorUtils.logAndGetError(err as Error, `An error occurred while creating the ${projectName} project.`);
  }
};

export default { createOrUpdateProject };
