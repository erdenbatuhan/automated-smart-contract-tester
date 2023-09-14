import Logger from '@logging/logger';
import type AppError from '@errors/app-error';

import type { IDockerImage } from '@models/docker-image';
import DockerContainerHistory from '@models/docker-container-history';
import type { IDockerContainerHistory } from '@models/docker-container-history';
import type { IDockerContainerResults } from '@models/schemas/docker-container-results';

import ContainerPurpose from '@models/enums/container-purpose';
import DockerExitCode from '@models/enums/docker-exit-code';

import dockerImageService from '@services/docker-image-service';
import dockerContainerHistoryService from '@services/docker-container-history-service';

import errorUtils from '@utils/error-utils';
import fsUtils from '@utils/fs-utils';
import dockerUtils from '@utils/docker-utils';
import forgeUtils from '@forge/utils/forge-utils';

/**
 * Processes the docker container output, which is the test execution output.
 *
 * @param {string} imageName - The name of the Docker Image.
 * @param {IDockerContainerResults['output']} output - The "unprocessed" execution output.
 * @returns {IDockerContainerResults['output']} The extracted test results.
 */
const processDockerContainerOutput = (
  imageName: string, output: IDockerContainerResults['output']
): IDockerContainerResults['output'] => {
  try {
    return forgeUtils.processForgeTestOutput(output?.data);
  } catch (err: Error | unknown) {
    throw errorUtils.handleError(err, `An error occurred while extracting the test results from the executed Docker container created from the image '${imageName}'.`);
  }
};

/**
 * Runs a Docker container with files read from a zip buffer, executes the given command, and updates the Docker container history.
 *
 * @param {Buffer} zipBuffer - The zip buffer containing source files.
 * @param {IDockerImage} dockerImage - The Docker image to be executed.
 * @param {string} commandExecuted - The command to execute inside the Docker container.
 * @returns {Promise<IDockerContainerHistory>} A promise that resolves to the updated Docker Container History.
 * @throws {Error} If any error occurs during execution.
 */
const runImageWithFilesInZipBuffer = async (
  zipBuffer: Buffer, dockerImage: IDockerImage, commandExecuted: string
): Promise<IDockerContainerHistory> => {
  const dockerContainerHistory = new DockerContainerHistory({ dockerImage, purpose: ContainerPurpose.TEST_EXECUTION });
  const execName = `${dockerImage.imageName}_execution_${dockerContainerHistory._id}_${Date.now()}`;

  // Extract source files from the zip buffer
  const { dirPath: tempDirPath, extractedPath: tempSrcDirPath } = await fsUtils.readFromZipBuffer(execName, zipBuffer);

  // Execute tests against smart contracts in the source files using a Docker container
  Logger.info(`Executing the tests using the following command in the ${dockerImage.imageName} image: ${commandExecuted}.`);
  const containerResults = await dockerUtils.runImage(
    execName, dockerImage.imageName, commandExecuted, { srcDirPath: tempSrcDirPath }
  ).finally(() => {
    // Remove the temporary directory after running the container
    fsUtils.removeDirectorySync(tempDirPath);
    Logger.info(`Executed the tests with the command '${commandExecuted}' in the ${dockerImage.imageName} image.`);
  });

  // Extract and process test execution results from the container output (if the execution has exited with a non-error code)
  if (containerResults.statusCode === DockerExitCode.PURPOSELY_STOPPED) {
    containerResults.output = processDockerContainerOutput(
      dockerImage.imageName, containerResults.output);
  }

  // Add container results to the Docker Container History
  dockerContainerHistory.container = containerResults;
  return dockerContainerHistory;
};

/**
 * Execute tests in a Docker container using the specified image and zip buffer.
 *
 * @param {string} imageName - The name of the Docker Image.
 * @param {Buffer} zipBuffer - The zip buffer containing source files.
 * @param {object} [execArgs] - Optional additional execution arguments.
 * @returns {Promise<IDockerContainerHistory>} A promise that resolves to the Docker Container History.
 * @throws {AppError} If any error occurs during the execution.
 */
const executeTests = async (
  imageName: string, zipBuffer: Buffer, execArgs?: object
): Promise<IDockerContainerHistory> => {
  const testExecutionCommand = forgeUtils.getTestExecutionCommand(execArgs);
  const dockerImage = await dockerImageService.findDockerImage(imageName);
  const dockerContainerHistory = await runImageWithFilesInZipBuffer(zipBuffer, dockerImage!, testExecutionCommand);

  return dockerContainerHistoryService.saveDockerContainerHistory(dockerContainerHistory)
    .then((dockerContainerHistorySaved) => {
      Logger.info(`Execution history for the Docker container created from the image '${imageName}' has been successfully saved.`);
      return dockerContainerHistorySaved;
    }).catch((err: AppError | Error | unknown) => {
      throw errorUtils.handleError(err, `Failed to save execution history for the Docker container created from the image '${imageName}'.`);
    });
};

export default { executeTests };
