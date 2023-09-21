import Logger from '@Logger';
import AppError from '@errors/AppError';

import type { IDockerImage } from '@models/DockerImage';
import DockerContainerHistory from '@models/DockerContainerHistory';
import type { IDockerContainerHistory } from '@models/DockerContainerHistory';
import type { IDockerContainerResults } from '@models/schemas/DockerContainerResultsSchema';

import ContainerPurpose from '@models/enums/ContainerPurpose';
import DockerExitCode from '@models/enums/DockerExitCode';

import dockerImageServices from '@services/dockerImageServices';
import dockerContainerHistoryServices from '@services/dockerContainerHistoryServices';

import fsUtils from '@utils/fsUtils';
import dockerUtils from '@utils/dockerUtils';
import forgeUtils from '@forge/utils/forgeUtils';

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
    throw AppError.createAppError(err, `An error occurred while extracting the test results from the executed Docker container created from the image '${imageName}'.`);
  }
};

/**
 * Runs a Docker container with files read from a zip buffer, executes the given command, and updates the Docker container history.
 *
 * @param {Buffer} zipBuffer - The zip buffer containing source files.
 * @param {IDockerImage} dockerImage - The Docker image to be executed.
 * @param {string} commandExecuted - The command to execute inside the Docker container.
 * @param {object} [options] - Optional additional execution options.
 * @param {number} [options.containerTimeout] - Timeout for container execution in seconds.
 * @returns {Promise<IDockerContainerHistory>} A promise that resolves to the updated Docker Container History.
 * @throws {Error} If any error occurs during execution.
 */
const runImageWithFilesInZipBuffer = async (
  zipBuffer: Buffer, dockerImage: IDockerImage, commandExecuted: string,
  { containerTimeout }: { containerTimeout?: number; } = {}
): Promise<IDockerContainerHistory> => {
  const dockerContainerHistory = new DockerContainerHistory({ dockerImage, purpose: ContainerPurpose.TEST_EXECUTION });
  const execName = `${dockerImage.imageName}_execution_${dockerContainerHistory._id}_${Date.now()}`;

  // Extract source files from the zip buffer
  const { dirPath: tempDirPath, extractedPath: tempSrcDirPath } = await fsUtils.readFromZipBuffer(execName, zipBuffer);

  // Execute tests against smart contracts in the source files using a Docker container
  Logger.info(`Executing the tests using the following command in the ${dockerImage.imageName} image: ${commandExecuted}.`);
  const containerResults = await dockerUtils.runImage(
    execName, dockerImage.imageName, commandExecuted, { srcDirPath: tempSrcDirPath, timeout: containerTimeout }
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
 * @param {object} [options] - Optional additional execution options.
 * @param {number} [options.containerTimeout] - Timeout for container execution in seconds.
 * @param {object} [options.execArgs] - Additional execution arguments to pass to the container.
 * @returns {Promise<IDockerContainerHistory>} A promise that resolves to the Docker Container History.
 * @throws {AppError} If any error occurs during the execution.
 */
const executeTests = async (
  imageName: string, zipBuffer: Buffer,
  { containerTimeout, execArgs }: { containerTimeout?: number; execArgs?: object; } = {}
): Promise<IDockerContainerHistory> => {
  const testExecutionCommand = forgeUtils.getTestExecutionCommand(execArgs);
  const dockerImage = await dockerImageServices.findDockerImage(imageName);
  const dockerContainerHistory = await runImageWithFilesInZipBuffer(
    zipBuffer, dockerImage!, testExecutionCommand, { containerTimeout });

  return dockerContainerHistoryServices.saveDockerContainerHistory(dockerContainerHistory)
    .then((dockerContainerHistorySaved) => {
      Logger.info(`Execution history for the Docker container created from the image '${imageName}' has been successfully saved.`);
      return dockerContainerHistorySaved;
    }).catch((err: AppError | Error | unknown) => {
      throw AppError.createAppError(err, `Failed to save execution history for the Docker container created from the image '${imageName}'.`);
    });
};

export default { executeTests };
