import { IDockerImage } from '../models/docker-image';
import DockerContainerHistory, { IDockerContainerHistory } from '../models/docker-container-history';

import Status from '../models/enums/status';
import Logger from '../logging/logger';

import dockerImageService from '../services/docker-image-service';

import constantUtils from '../utils/constant-utils';
import errorUtils from '../utils/error-utils';
import fsUtils from '../utils/fs-utils';
import dockerUtils from '../utils/docker-utils';
import testOutputUtils from '../utils/test-output-utils';

/**
 * Extracts test names from execution output based on the status.
 *
 * @param {IDockerContainerHistory} dockerContainerExecutionInfo - Docker container execution info
 * @returns {IDockerContainerHistory['output']} An array of test names or the original output if the status is not SUCCESS.
 */
const extractTestsFromExecutionOutput = (dockerContainerExecutionInfo: IDockerContainerHistory): IDockerContainerHistory['output'] => {
  const { status, output } = dockerContainerExecutionInfo;

  if (status === Status.SUCCESS) {
    return { tests: testOutputUtils.extractTestNamesFromGasSnapshot(output?.data) } as IDockerContainerHistory['output'];
  }

  return { error: output };
};

/**
 * Creates a new project with the given name from a ZIP buffer.
 *
 * @param {string} projectName - The name of the new project.
 * @param {Buffer} zipBuffer - The ZIP buffer containing the project files.
 * @returns {Promise<{ image: IDockerImage | null, output: string[] | any }>} A promise that resolves to an object containing the created Docker image and the extracted test names.
 * @throws {Error} If any error occurs during project creation.
 */
const createNewProject = async (
  projectName: string, zipBuffer: Buffer
): Promise<{ image: IDockerImage | null, output: string[] | any }> => {
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

    // Retrieve the names of the tests from the gas snapshot output and update the Docker container execution output
    dockerContainerHistory.output = extractTestsFromExecutionOutput(dockerContainerHistory);

    // Save (or update it if it already exists) the Docker image with the Docker container history for the executed container
    return await dockerImageService.upsertWithDockerContainerHistory(dockerImage, dockerContainerHistory)
      .then(({ dockerImageSaved, dockerContainerHistorySaved }) => {
        Logger.info(`Created the ${projectName} project with the Docker image (${dockerImage.imageID}).`);
        return { image: dockerImageSaved, output: dockerContainerHistorySaved.output };
      });
  } catch (err: Error | any) {
    throw errorUtils.getErrorWithoutDetails(`An error occurred while creating the ${projectName} project.`, err);
  }
};

export default { createNewProject };
