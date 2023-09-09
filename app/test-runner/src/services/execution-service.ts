import Logger from '@logging/logger';

import DockerContainerHistory from '@models/docker-container-history';
import type { DockerContainerExecutionOutput, IDockerContainerHistory } from '@models/docker-container-history';
import Status from '@models/enums/status';

import dockerImageService from '@services/docker-image-service';
import dockerContainerHistoryService from '@services/docker-container-history-service';

import constantUtils from '@utils/constant-utils';
import errorUtils from '@utils/error-utils';
import fsUtils from '@utils/fs-utils';
import dockerUtils from '@utils/docker-utils';
import forgeUtils from '@utils/forge-utils';
import { IDockerImage } from '@models/docker-image';

/**
 * Extracts test results from execution output based on the status.
 *
 * @param {string} imageName - The name of the Docker Image.
 * @param {DockerContainerExecutionOutput | undefined} output - The execution output.
 * @returns {DockerContainerExecutionOutput} The extracted test results.
 */
const extractTestResultsFromExecutionOutput = (
  imageName: string, output: DockerContainerExecutionOutput | undefined
): DockerContainerExecutionOutput => {
  try {
    return {
      ...forgeUtils.extractTestExecutionResultsFromExecutionOutput(output?.data),
      ...forgeUtils.extractGasDiffAnalysisFromExecutionOutput(output?.data)
    } as DockerContainerExecutionOutput;
  } catch (err: Error | unknown) {
    throw errorUtils.logAndGetError(err as Error, `An error occurred while extracting the test results from the executed Docker container created from the image '${imageName}'.`);
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
  let dockerContainerHistory = new DockerContainerHistory({ dockerImage, commandExecuted });

  try {
    Logger.info(`Running the tests using the following command in the ${dockerImage.imageName} image: ${commandExecuted}.`);
    const execName = `${dockerImage.imageName}_execution_${dockerContainerHistory._id}_${Date.now()}`;

    // Read the source files from the zip buffer
    const {
      dirPath: tempDirPath,
      extractedPath: tempSrcDirPath
    } = await fsUtils.readFromZipBuffer(execName, zipBuffer);

    // Run the Docker container to execute the tests and update the docker container history
    dockerContainerHistory = await dockerUtils.runImage(
      execName, dockerImage.imageName, dockerContainerHistory, tempSrcDirPath
    ).finally(() => {
      fsUtils.removeDirectorySync(tempDirPath); // Remove the temp directory after running the container
      Logger.info(`Executed the tests with the command '${commandExecuted}' in the ${dockerImage.imageName} image.`);
    });
  } catch (err: Error | unknown) {
    dockerContainerHistory.output = { error: (err as Error)?.message };
    Logger.warn(`Failed to execute the tests with the command '${commandExecuted}' in the ${dockerImage.imageName} image! (Error: ${(err as Error)?.message})`);
  }

  // Extract the test execution results from the test output (if the execution has been successful) and update the Docker Container History with the execution results
  if (dockerContainerHistory.status === Status.SUCCESS) {
    dockerContainerHistory.output = extractTestResultsFromExecutionOutput(
      dockerImage.imageName, dockerContainerHistory.output);
  }

  return dockerContainerHistory;
};

/**
 * Execute tests in a Docker container using the specified image and zip buffer.
 *
 * @param {string} imageName - The name of the Docker Image.
 * @param {Buffer} zipBuffer - The zip buffer containing source files.
 * @param {object=} [execArgs] - Optional additional execution arguments.
 * @returns {Promise<IDockerContainerHistory>} A promise that resolves to the Docker Container History.
 * @throws {Error} If any error occurs during the execution.
 */
const executeTests = async (
  imageName: string, zipBuffer: Buffer, execArgs?: object
): Promise<IDockerContainerHistory> => {
  const executionArgsString = forgeUtils.convertTestExecutionArgsToString(execArgs);
  const commandExecuted = `${constantUtils.FORGE_COMMANDS.COMPARE_SNAPSHOTS} ${executionArgsString}`;

  const dockerImage = await dockerImageService.findDockerImage(imageName);
  const dockerContainerHistory = await runImageWithFilesInZipBuffer(zipBuffer, dockerImage, commandExecuted);

  return dockerContainerHistoryService.saveDockerContainerHistory(dockerContainerHistory)
    .then((dockerContainerHistorySaved) => {
      Logger.info(`Execution history for the Docker container created from the image '${imageName}' has been successfully saved.`);
      return dockerContainerHistorySaved;
    }).catch((err: Error | unknown) => {
      throw errorUtils.logAndGetError(err as Error, `Failed to save execution history for the Docker container created from the image '${imageName}'.`);
    });
};

export default { executeTests };
