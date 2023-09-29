import path from 'path';

import Constants from '@Constants';
import Logger from '@Logger';
import AppError from '@errors/AppError';

import type { IDockerImage } from '@models/DockerImage';
import DockerContainerHistory from '@models/DockerContainerHistory';
import type { IDockerContainerHistory } from '@models/DockerContainerHistory';

import ContainerPurpose from '@models/enums/ContainerPurpose';

import dockerImageServices from '@services/dockerImageServices';
import executionServices from '@services/executionServices';

import fsUtils from '@utils/fsUtils';
import dockerUtils from '@utils/dockerUtils';

/**
 * Reads and extracts a project from a zip buffer, ensuring it contains the required files and folders.
 *
 * @param {string} execName - The name of the execution.
 * @param {Buffer} zipBuffer - The zip buffer containing the project.
 * @returns {Promise<{ tempDirPath: string; tempSrcDirPath: string; tempProjectDirPath: string; }>} A promise that resolves to an object containing temporary directory paths.
 */
const readProjectFromZipBuffer = async (
  execName: string, zipBuffer: Buffer
): Promise<{ tempDirPath: string; tempSrcDirPath: string; tempProjectDirPath: string; }> => fsUtils.readFromZipBuffer(
  execName,
  zipBuffer,
  {
    requiredFiles: Constants.PROJECT_UPLOAD_REQUIREMENTS_FILES,
    requiredFolders: Constants.PROJECT_UPLOAD_REQUIREMENTS_FOLDERS
  },
  [Constants.PATH_PROJECT_TEMPLATE]
).then(({ dirPath: tempDirPath, extractedPath: tempProjectDirPath }) => ({
  tempDirPath,
  tempSrcDirPath: path.join(tempProjectDirPath, Constants.PROJECT_FOLDERS.SRC),
  tempProjectDirPath
}));

/**
 * Creates a new project or updates an existing one with the given name from a ZIP buffer.
 *
 * @param {string} projectName - The name of the project.
 * @param {Buffer} zipBuffer - The ZIP buffer containing the project files.
 * @param {object} [options] - Optional additional execution options.
 * @param {number} [options.containerTimeout] - Timeout for container execution in seconds.
 * @param {object} [options.execArgs] - Additional execution arguments to pass to the container.
 * @returns {Promise<{ isNew: boolean; project: IDockerContainerHistory }>}
 *          A promise that resolves to an object containing the created Docker Image and the extracted test names.
 * @throws {AppError} If any error occurs during project creation.
 */
const saveProject = async (
  projectName: string, zipBuffer: Buffer,
  { containerTimeout, execArgs }: { containerTimeout?: number; execArgs?: object; } = {}
): Promise<{ isNew: boolean; project: IDockerContainerHistory }> => {
  let dockerImage: IDockerImage | null = null;

  try {
    Logger.info(`Creating the ${projectName} project.`);
    const execName = `${projectName}_creation_${Date.now()}`;

    // Read the project from the zip buffer and use it to create a Docker Image
    const { tempDirPath, tempSrcDirPath, tempProjectDirPath } = await readProjectFromZipBuffer(execName, zipBuffer);
    dockerImage = await dockerUtils.createImage(projectName, tempProjectDirPath);

    // Run docker image and add container results to the Docker Container History
    const containerResults = await executionServices.runImageWithFilesInZipBuffer(
      dockerImage!, execName, { tempDirPath, tempSrcDirPath }, { containerTimeout, execArgs });

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
    throw AppError.createAppError(err, `An error occurred while creating the ${projectName} project.`);
  }
};

export default { saveProject };
