import Constants from '~constants';
import Logger from '@logging/logger';
import type AppError from '@errors/app-error';

import type { IDockerImage } from '@models/docker-image';
import DockerContainerHistory from '@models/docker-container-history';
import type { IDockerContainerHistory } from '@models/docker-container-history';
import type { IDockerContainerResults } from '@models/schemas/docker-container-results';
import Status from '@models/enums/status';
import ContainerPurpose from '@models/enums/container-purpose';

import dockerImageService from '@services/docker-image-service';

import errorUtils from '@utils/error-utils';
import fsUtils from '@utils/fs-utils';
import dockerUtils from '@utils/docker-utils';
import forgeUtils from '@forge/utils/forge-utils';

/**
 * Processes the docker container output, which is the gas snapshot output.
 *
 * @param {string} projectName - The name of the new project.
 * @param {IDockerContainerResults['output']} output - The "unprocessed" execution output.
 * @returns {{ tests: string[] }} An object containing the test names.
 * @throws {AppError} If any error occurs while retrieving the names of the tests.
 */
const processDockerContainerOutput = (
  projectName: string, output: IDockerContainerResults['output']
): IDockerContainerResults['output'] => {
  try {
    return forgeUtils.processForgeSnapshotOutput(output?.data);
  } catch (err: Error | unknown) {
    throw errorUtils.handleError(err, `An error occurred while retrieving the names of the tests for the ${projectName} project from the gas snapshot output.`);
  }
};

/**
 * Creates a new project or updates an existing one with the given name from a ZIP buffer.
 *
 * @param {string} projectName - The name of the project.
 * @param {Buffer} zipBuffer - The ZIP buffer containing the project files.
 * @returns {Promise<{ isNew: boolean; project: IDockerContainerHistory }>}
 *          A promise that resolves to an object containing the created Docker Image and the extracted test names.
 * @throws {AppError} If any error occurs during project creation.
 */
const saveProject = async (
  projectName: string, zipBuffer: Buffer
): Promise<{ isNew: boolean; project: IDockerContainerHistory }> => {
  let dockerImage: IDockerImage | null = null;

  try {
    Logger.info(`Creating the ${projectName} project.`);
    const execName = `${projectName}_creation_${Date.now()}`;

    // Read the project from the zip buffer
    const { dirPath: tempDirPath, extractedPath: tempProjectDirPath } = await fsUtils.readFromZipBuffer(
      execName,
      zipBuffer,
      { requiredFiles: Constants.REQUIRED_FILES, requiredFolders: Constants.REQUIRED_FOLDERS },
      [Constants.PATH_PROJECT_TEMPLATE]
    );

    // Create a Docker Image from the project read from the zip buffer
    dockerImage = await dockerUtils.createImage(projectName, tempProjectDirPath)
      .finally(() => fsUtils.removeDirectorySync(tempDirPath)); // Remove the temp directory after creating the image

    // Run the Docker container to get the gas snapshot file
    const containerResults = await dockerUtils.runImage(execName, dockerImage!.imageName, Constants.CMD_RETRIEVE_SNAPSHOTS);

    // Create a new docker container history
    const dockerContainerHistory = new DockerContainerHistory({
      dockerImage,
      status: containerResults.statusCode === 0 ? Status.SUCCESS : Status.FAILURE,
      purpose: ContainerPurpose.PROJECT_CREATION,
      container: containerResults
    });

    // Process the results and extract the test info from the gas snapshot output (if the execution has been successful)
    if (dockerContainerHistory.status === Status.SUCCESS) {
      dockerContainerHistory.container!.output = processDockerContainerOutput(projectName, containerResults.output);
    }

    // Save (or update it if it already exists) the Docker Image with the Docker Container History for the executed container
    return await dockerImageService.saveDockerImageWithDockerContainerHistory(dockerImage!, dockerContainerHistory)
      .then(({ isNew, dockerContainerHistorySaved }) => {
        Logger.info(`Created the ${projectName} project with the Docker Image (${dockerImage!.imageID}).`);
        return { isNew, project: dockerContainerHistorySaved };
      });
  } catch (err: AppError | Error | unknown) {
    // If an error has occurred, remove the Docker image if it has been created
    if (dockerImage) {
      await dockerUtils.removeImage(dockerImage!.imageName, { shouldPrune: true });
    }

    // Throw error
    throw errorUtils.handleError(err, `An error occurred while creating the ${projectName} project.`);
  }
};

export default { saveProject };
