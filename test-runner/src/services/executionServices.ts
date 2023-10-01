import Logger from '@Logger';
import AppError from '@errors/AppError';

import type { IDockerImage } from '@models/DockerImage';
import DockerContainerHistory from '@models/DockerContainerHistory';
import type { IDockerContainerHistory } from '@models/DockerContainerHistory';
import type { IDockerContainerResults } from '@models/schemas/DockerContainerResultsSchema';

import ContainerPurpose from '@models/enums/ContainerPurpose';

import dockerImageServices from '@services/dockerImageServices';
import dockerContainerHistoryServices from '@services/dockerContainerHistoryServices';

import fsUtils from '@utils/fsUtils';
import dockerUtils from '@utils/dockerUtils';
import forgeUtils from '@forge/utils/forgeUtils';

/**
 * Runs a Docker container with files read from a zip buffer, executes the given command,
 * and updates the Docker container history.
 *
 * @param {IDockerImage} dockerImage - The Docker image to be executed.
 * @param {string} execName - The name of the execution
 * @param {{ tempDirPath: string; tempSrcDirPath: string; }} [fileOptions] - The temporary directory & source directory paths.
 * @param {{ containerTimeout?: number; execArgs?: object; }} [executionOptions] - Optional additional execution options.
 * @returns {Promise<IDockerContainerResults>} A promise that resolves to the Docker container results.
 * @throws {Error} If any error occurs during execution.
 */
const runImageWithFilesInZipBuffer = async (
  dockerImage: IDockerImage, execName: string,
  fileOptions: { tempDirPath: string; tempSrcDirPath: string; },
  executionOptions: { containerTimeout?: number; execArgs?: object; } = {}
): Promise<IDockerContainerResults> => {
  const commandExecuted = forgeUtils.getTestExecutionCommand(executionOptions.execArgs);

  // Execute tests against smart contracts in the source files using a Docker container
  Logger.info(`Executing the tests using the following command in the ${dockerImage.imageName} image: ${commandExecuted}.`);
  const containerResults = await dockerUtils.runImage(
    execName, dockerImage.imageName, commandExecuted, {
      srcDirPath: fileOptions.tempSrcDirPath,
      timeout: executionOptions.containerTimeout
    }
  ).finally(() => {
    // Remove the temporary directory after running the container
    fsUtils.removeDirectorySync(fileOptions.tempDirPath);
    Logger.info(`Executed the tests with the command '${commandExecuted}' in the ${dockerImage.imageName} image.`);
  });

  // Extract and process test execution results from the container output
  try {
    containerResults.output = forgeUtils.processForgeTestOutput(containerResults);
  } catch (err: Error | unknown) {
    throw AppError.createAppError(err, `An error occurred while extracting the test results from the executed Docker container created from the image '${dockerImage.imageName}'.`);
  }

  return containerResults;
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
  const dockerImage = await dockerImageServices.findDockerImage(imageName);
  const dockerContainerHistory = new DockerContainerHistory({ dockerImage, purpose: ContainerPurpose.TEST_EXECUTION });
  const execName = `${dockerImage!.imageName}_execution_${dockerContainerHistory._id}_${Date.now()}`;

  // Extract source files from the zip buffer
  const { dirPath: tempDirPath, extractedPath: tempSrcDirPath } = await fsUtils.readFromZipBuffer(execName, zipBuffer);

  // Run docker image and add container results to the Docker Container History
  dockerContainerHistory.container = await runImageWithFilesInZipBuffer(
    dockerImage!, execName, { tempDirPath, tempSrcDirPath }, { containerTimeout, execArgs });

  return dockerContainerHistoryServices.saveDockerContainerHistory(dockerContainerHistory)
    .then((dockerContainerHistorySaved) => {
      Logger.info(`Execution history for the Docker container created from the image '${imageName}' has been successfully saved.`);
      return dockerContainerHistorySaved;
    }).catch((err: AppError | Error | unknown) => {
      throw AppError.createAppError(err, `Failed to save execution history for the Docker container created from the image '${imageName}'.`);
    });
};

export default { runImageWithFilesInZipBuffer, executeTests };
