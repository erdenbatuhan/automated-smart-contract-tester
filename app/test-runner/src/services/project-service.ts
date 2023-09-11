import Constants from '~constants';
import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import type { IDockerImage } from '@models/docker-image';
import DockerContainerHistory from '@models/docker-container-history';
import type { IDockerContainerExecutionOutput } from '@models/schemas/docker-container-execution-output';
import Status from '@models/enums/status';

import dockerImageService from '@services/docker-image-service';

import errorUtils from '@utils/error-utils';
import fsUtils from '@utils/fs-utils';
import dockerUtils from '@utils/docker-utils';
import forgeUtils from '@utils/forge-utils';

/**
 * Retrieves the names of the tests from the gas snapshot output.
 *
 * @param {string} projectName - The name of the new project.
 * @param {IDockerContainerExecutionOutput | undefined} output - The execution output.
 * @returns {{ tests: string[] }} An object containing the test names.
 * @throws {AppError} If any error occurs while retrieving the names of the tests.
 */
const retrieveTestNamesFromGasSnapshot = (
  projectName: string, output: IDockerContainerExecutionOutput | undefined
): { tests: string[] } => {
  try {
    return { tests: forgeUtils.retrieveTestNamesFromGasSnapshot(output?.data) };
  } catch (err: Error | unknown) {
    const message = `An error occurred while retrieving the names of the tests for the ${projectName} project from the gas snapshot output.`;
    throw errorUtils.logAndGetError(new AppError(500, message, (err as Error)?.message));
  }
};

/**
 * Creates a new project or updates an existing one with the given name from a ZIP buffer.
 *
 * @param {string} projectName - The name of the project.
 * @param {Buffer} zipBuffer - The ZIP buffer containing the project files.
 * @returns {Promise<{ isNew: boolean; project: { image: IDockerImage; output: IDockerContainerExecutionOutput | undefined } }>}
 *          A promise that resolves to an object containing the created Docker Image and the extracted test names.
 * @throws {AppError} If any error occurs during project creation.
 */
const saveProject = async (
  projectName: string, zipBuffer: Buffer
): Promise<{ isNew: boolean; project: { image: IDockerImage; output: IDockerContainerExecutionOutput | undefined } }> => {
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
      { requiredFiles: Constants.REQUIRED_FILES, requiredFolders: Constants.REQUIRED_FOLDERS },
      [Constants.PATH_PROJECT_TEMPLATE]
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
  } catch (err: AppError | Error | unknown) {
    // If an error has occurred, remove the Docker image if it has been created
    if (dockerImage) {
      await dockerUtils.removeImage(dockerImage!.imageName, { shouldPrune: true });
    }

    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while creating the ${projectName} project.`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
  }
};

export default { saveProject };
