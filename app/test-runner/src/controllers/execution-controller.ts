import { IDockerImage } from '../models/docker-image';
import DockerContainerHistory, { IDockerContainerHistory } from '../models/docker-container-history';

import Status from '../models/enums/status';
import Logger from '../logging/logger';
import HTTPError from '../errors/http-error';

import dockerImageService from '../services/docker-image-service';
import dockerContainerHistoryService from '../services/docker-container-history-service';

import constantUtils from '../utils/constant-utils';
import errorUtils from '../utils/error-utils';
import fsUtils from '../utils/fs-utils';
import dockerUtils from '../utils/docker-utils';
import testOutputUtils from '../utils/test-output-utils';

/**
 * Find a Docker image by name.
 *
 * @param {string} imageName - The name of the Docker image to find.
 * @returns {Promise<IDockerImage>} A promise that resolves to the found Docker image.
 * @throws {HTTPError} If an HTTP error occurs during the request.
 * @throws {Error} If any other error occurs.
 */
const findDockerImageByName = async (imageName: string): Promise<IDockerImage> => {
  try {
    return await dockerImageService.findByName(imageName);
  } catch (err: HTTPError | Error | any) {
    if (err instanceof HTTPError) {
      Logger.error(err.message);
      throw err;
    }

    throw errorUtils.getErrorWithoutDetails(`An error occurred while finding the docker image with the name=${imageName}.`, err);
  }
};

/**
 * Extract test results from execution output based on the status.
 *
 * @param {IDockerContainerHistory['status']} dockerContainerExecutionInfo - Docker container execution info
 * @returns {IDockerContainerHistory['output']} The extracted test results or the original output if the status is not SUCCESS.
 */
const extractTestResultsFromExecutionOutput = (dockerContainerExecutionInfo: IDockerContainerHistory): IDockerContainerHistory['output'] => {
  const { status, output } = dockerContainerExecutionInfo;
  if (status === Status.SUCCESS) {
    return {
      ...testOutputUtils.extractTestExecutionResults(output?.data),
      ...testOutputUtils.extractGasDiffAnalysis(output?.data)
    } as IDockerContainerHistory['output'];
  }

  return { error: output };
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
    const tempSrcDirPath = await fsUtils.readFromZipBuffer(execName, zipBuffer);

    // Run the Docker container to execute the tests and update the docker container history
    dockerContainerHistory = await dockerUtils.runImage(
      execName, dockerImage.imageName, dockerContainerHistory, tempSrcDirPath
    ).finally(() => {
      fsUtils.removeDirectorySync(tempSrcDirPath); // Remove the temp directory after running the container
      Logger.info(`Executed the tests with the command '${commandExecuted}' in the ${imageName} image.`);
    });
  } catch (err: Error | any) {
    const errMessage = err && err.message;

    dockerContainerHistory.output = { error: errMessage };
    Logger.warn(`Failed to execute the tests with the command '${commandExecuted}' in the ${imageName} image! (Error: ${errMessage})`);
  }

  // Extract the test execution results from the test output and update the Docker container history with the execution results
  try {
    dockerContainerHistory.output = extractTestResultsFromExecutionOutput(dockerContainerHistory);
  } catch (err: Error | any) {
    throw errorUtils.getErrorWithoutDetails(`An error occurred while extracting the test results from the executed Docker container created from the image '${imageName}'.`, err);
  }

  return dockerContainerHistoryService.save(dockerContainerHistory).then((dockerContainerHistorySaved) => {
    Logger.info(`Execution history for the Docker container created from the image '${imageName}' has been successfully saved.`);
    return dockerContainerHistorySaved;
  }).catch((err) => {
    throw errorUtils.getErrorWithoutDetails(`Failed to save execution history for the Docker container created from the image '${imageName}'.`, err);
  });
};

export default { executeTests };
