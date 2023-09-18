import Constants from '~Constants';
import Logger from '@logging/Logger';
import type AppError from '@errors/AppError';

import type { IDockerImage } from '@models/DockerImage';
import DockerContainerHistory from '@models/DockerContainerHistory';
import type { IDockerContainerHistory } from '@models/DockerContainerHistory';
import type { IDockerContainerResults } from '@models/schemas/DockerContainerResults';

import ContainerPurpose from '@models/enums/ContainerPurpose';
import DockerExitCode from '@models/enums/DockerExitCode';

import dockerImageServices from '@services/dockerImageService';

import errorUtils from '@utils/errorUtils';
import fsUtils from '@utils/fsUtils';
import dockerUtils from '@utils/dockerUtils';
import forgeUtils from '@forge/utils/forgeUtils';

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
 * Reads and extracts a project from a zip buffer, ensuring it contains the required files and folders.
 *
 * @param {string} execName - The name of the execution.
 * @param {Buffer} zipBuffer - The zip buffer containing the project.
 * @returns {Promise<{ tempDirPath: string, tempProjectDirPath: string }>} A promise that resolves to an object containing temporary directory paths.
 */
const readProjectFromZipBuffer = async (
  execName: string, zipBuffer: Buffer
): Promise<{ tempDirPath: string, tempProjectDirPath: string }> => fsUtils.readFromZipBuffer(
  execName,
  zipBuffer,
  {
    requiredFiles: Constants.PROJECT_UPLOAD_REQUIREMENTS_FILES,
    requiredFolders: Constants.PROJECT_UPLOAD_REQUIREMENTS_FOLDERS
  },
  [Constants.PATH_PROJECT_TEMPLATE]
).then(({ dirPath: tempDirPath, extractedPath: tempProjectDirPath }) => ({ tempDirPath, tempProjectDirPath }));

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

    // Read the project from the zip buffer and use it to create a Docker Image
    const { tempDirPath, tempProjectDirPath } = await readProjectFromZipBuffer(execName, zipBuffer);
    dockerImage = await dockerUtils.createImage(projectName, tempProjectDirPath)
      .finally(() => fsUtils.removeDirectorySync(tempDirPath)); // Remove the temporary directory after creating the image

    // Run the Docker container to obtain the gas snapshot file and process the results (if the execution has exited with a non-error code)
    const containerResults = await dockerUtils.runImage(execName, dockerImage!.imageName, Constants.CMD_RETRIEVE_SNAPSHOTS);
    if (containerResults.statusCode === DockerExitCode.PURPOSELY_STOPPED) {
      containerResults.output = processDockerContainerOutput(projectName, containerResults.output);
    }

    // Create a new Docker Container History
    const dockerContainerHistory = new DockerContainerHistory({
      dockerImage, purpose: ContainerPurpose.PROJECT_CREATION, container: containerResults
    });

    // Save (or update it if it already exists) the Docker Image with the Docker Container History for the executed container
    return await dockerImageServices.saveDockerImageWithDockerContainerHistory(dockerImage!, dockerContainerHistory)
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
