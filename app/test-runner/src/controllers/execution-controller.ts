import Logger from '@logging/logger';
import HTTPError from '@errors/http-error';

import type { IDockerImage } from '@models/docker-image';
import DockerContainerHistory from '@models/docker-container-history';
import type { DockerContainerExecutionOutput, IDockerContainerHistory } from '@models/docker-container-history';
import Status from '@models/enums/status';

import dockerImageService from '@services/docker-image-service';
import dockerContainerHistoryService from '@services/docker-container-history-service';

import constantUtils from '@utils/constant-utils';
import errorUtils from '@utils/error-utils';
import fsUtils from '@utils/fs-utils';
import dockerUtils from '@utils/docker-utils';
import testOutputUtils from '@utils/test-output-utils';

/**
 * Find a Docker image by name.
 *
 * @param {string} imageName - The name of the Docker image to find.
 * @returns {Promise<IDockerImage>} A promise that resolves to the found Docker image.
 * @throws {HTTPError} If an HTTP error occurs during the request.
 * @throws {Error} If any other error occurs.
 */
const findDockerImageByName = async (
  imageName: string
): Promise<IDockerImage> => dockerImageService.findByName(imageName).catch((err: HTTPError | Error | unknown) => {
  if (err instanceof HTTPError) {
    Logger.error(err.message);
    throw err;
  }

  throw errorUtils.getErrorWithoutDetails(`An error occurred while finding the docker image with the name=${imageName}.`, err);
});

/**
 * Extract test results from execution output based on the status.
 *
 * @param {DockerContainerExecutionOutput | undefined} output - The execution output
 * @returns {DockerContainerExecutionOutput} The extracted test results
 */
const extractTestResultsFromExecutionOutput = (
  output: DockerContainerExecutionOutput | undefined
): DockerContainerExecutionOutput => {
  if (output?.data) {
    return {
      ...testOutputUtils.extractTestExecutionResults(output.data),
      ...testOutputUtils.extractGasDiffAnalysis(output.data)
    } as DockerContainerExecutionOutput;
  }

  return { data: 'No execution data found!' };
};

/**
 * Execute tests in a Docker container using the specified image and zip buffer.
 *
 * @param {string} imageName - The name of the Docker image.
 * @param {Buffer} zipBuffer - The zip buffer containing source files.
 * @returns {Promise<IDockerContainerHistory>} A promise that resolves to the Docker container history.
 * @throws {Error} If any error occurs during the execution.
 */
const executeTests = async (imageName: string, zipBuffer: Buffer): Promise<IDockerContainerHistory> => {
  const commandExecuted = constantUtils.FORGE_COMMANDS.COMPARE_SNAPSHOTS;
  const dockerImage = await findDockerImageByName(imageName);
  let dockerContainerHistory = new DockerContainerHistory({ dockerImage, commandExecuted });

  try {
    Logger.info(`Running the tests using the following command in the ${imageName} image: ${commandExecuted}.`);
    const execName = `${imageName}_execution_${dockerContainerHistory._id}_${Date.now()}`;

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
      Logger.info(`Executed the tests with the command '${commandExecuted}' in the ${imageName} image.`);
    });
  } catch (err: Error | unknown) {
    dockerContainerHistory.output = { error: (err as Error)?.message };
    Logger.warn(`Failed to execute the tests with the command '${commandExecuted}' in the ${imageName} image! (Error: ${(err as Error)?.message})`);
  }

  // Extract the test execution results from the test output (if the execution has been successful) and update the Docker container history with the execution results
  try {
    if (dockerContainerHistory.status === Status.SUCCESS) {
      dockerContainerHistory.output = extractTestResultsFromExecutionOutput(dockerContainerHistory.output);
    }
  } catch (err: Error | unknown) {
    throw errorUtils.getErrorWithoutDetails(`An error occurred while extracting the test results from the executed Docker container created from the image '${imageName}'.`, err);
  }

  return dockerContainerHistoryService.save(dockerContainerHistory).then((dockerContainerHistorySaved) => {
    Logger.info(`Execution history for the Docker container created from the image '${imageName}' has been successfully saved.`);
    return dockerContainerHistorySaved;
  }).catch((err: Error | unknown) => {
    throw errorUtils.getErrorWithoutDetails(`Failed to save execution history for the Docker container created from the image '${imageName}'.`, err);
  });
};

export default { executeTests };
