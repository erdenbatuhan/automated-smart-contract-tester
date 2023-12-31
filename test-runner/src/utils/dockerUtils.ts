import type { Container as ContainerType } from 'dockerode';
import Dockerode from 'dockerode';
import { HttpStatusCode } from 'axios';

import Constants from '@Constants';
import Logger from '@Logger';
import AppError from '@errors/AppError';

import type { IDockerImage } from '@models/DockerImage';
import type { IDockerContainerResults } from '@models/schemas/DockerContainerResultsSchema';
import DockerExitCode from '@models/enums/DockerExitCode';

import conversionUtils from '@utils/conversionUtils';
import fsUtils from '@utils/fsUtils';

interface DockerHttpError extends Error {
  statusCode: number;
  json: { message: string; };
}

interface DockerBuildStreamResult {
  error?: string;
  stream?: string;
}

interface DockerContainerExecutionOutput {
  statusCode: number;
  executionTimeSeconds: number;
  output: string;
}

/**
 * Checks if the Docker daemon is accessible using the specified socket path.
 *
 * @throws {AppError} If the Docker daemon cannot be accessed (Code = 503 Service Unavailable).
 * @returns {Promise<{ socketPath: string, info: object }>} A Promise that resolves to an object
 *                                                          containing the socket path and Dockerode info if accessible.
 */
const ensureDockerDaemonAccessibility = async (): Promise<{ socketPath: string, info: object }> => {
  try {
    const dockerode = new Dockerode({ socketPath: Constants.DOCKER_SOCKET_PATH });
    await dockerode.ping();

    return { socketPath: Constants.DOCKER_SOCKET_PATH, info: await dockerode.info() };
  } catch (err: Error | unknown) {
    const errMessage = `Failed to access the Docker daemon running on socket '${Constants.DOCKER_SOCKET_PATH}'`;
    throw AppError.createAppError(err, errMessage, HttpStatusCode.ServiceUnavailable);
  }
};

/**
 * Extracts the image ID from a Docker build stream result.
 *
 * @param {object[] | null} streamRes - An array of stream results from Docker build.
 * @returns {string} The extracted Docker image ID.
 * @throws {Error} If ID cannot be extracted
 */
const extractImageIDFromStreamResult = (streamRes: DockerBuildStreamResult[] | null): string => {
  try {
    const match = streamRes?.map(({ stream }) => stream).join('').match(/Successfully built ([a-f0-9]+)/);
    if (match && match[1]) return match[1];

    throw new Error('ID not found in the stream!');
  } catch (err: Error | unknown) {
    throw new Error(`An error occurred while extracting the image ID from stream. (Error: ${(err as Error)?.message})`);
  }
};

/**
 * Prunes unused Docker containers and images.
 *
 * @param {Dockerode} dockerode - The Dockerode instance.
 * @param {object} options - Options for pruning.
 * @param {string} [options.maxAge='24h'] - The maximum age of containers and images to keep before pruning.
 *                                          This should be a duration string (e.g., '24h' for 24 hours).
 * @returns {Promise<void>} A promise that resolves once the pruning is complete.
 */
const pruneUnused = async (dockerode: Dockerode, { maxAge = '24h' }: { maxAge?: string; } = {}): Promise<void> => {
  try {
    Logger.info(`Pruning unused containers and images (those older than ${maxAge}).`);

    // Prune unused containers and images
    await dockerode.pruneContainers({ filters: { until: [maxAge] } });
    await dockerode.pruneImages({ filters: { until: [maxAge] } });

    Logger.info(`Pruned unused containers and images (those older than ${maxAge}).`);
  } catch (err: DockerHttpError | Error | unknown) {
    const errMessage = `Could not prune unused container and images (those older than ${maxAge})`;

    // If a prune operation is already running and caused the error, do not throw an error
    if ((err as DockerHttpError).statusCode === HttpStatusCode.Conflict) {
      Logger.warn(`${errMessage}: ${(err as DockerHttpError)?.message} - It's okay though :)`);
    } else {
      Logger.error(`${errMessage}: ${(err as Error)?.message}`);
      throw err;
    }
  }
};

/**
 * Removes a Docker image by name and optionally prunes unused containers and images.
 *
 * @param {string} imageName - The name of the Docker image to remove.
 * @param {object} options - An options object.
 * @param {Dockerode} [options.dockerode] - The Dockerode instance. If not provided, a new instance will be created with the default socket path.
 * @param {boolean} [options.shouldPrune=false] - Indicates whether to prune unused containers and images after the removal.
 * @returns {Promise<void>} A promise that resolves once the image is removed.
 * @throws {Error} If any error occurs during the removal process.
 */
const removeImage = async (
  imageName: string, { dockerode, shouldPrune = false }: { dockerode?: Dockerode; shouldPrune?: boolean; } = {}
): Promise<void> => {
  const dockerodeInstance = dockerode || new Dockerode({ socketPath: Constants.DOCKER_SOCKET_PATH });

  try {
    Logger.info(`Removing the Docker image named '${imageName}'.`);

    const dockerImage = dockerodeInstance.getImage(imageName);
    if (dockerImage) await dockerImage.remove();

    Logger.info(`Successfully removed the Docker image named '${imageName}'.`);
  } catch (err: Error | unknown) {
    Logger.error(`Could not remove the Docker image named '${imageName}'. (Error: ${(err as Error)?.message})`);
  } finally {
    if (shouldPrune) await pruneUnused(dockerodeInstance); // Prune unused containers and images
  }
};

/**
 * Follows the progress of a Docker image build and retrieves the image ID.
 *
 * @param {string} imageName - The name of the Docker image to create.
 * @param {Dockerode} dockerode - The Dockerode instance.
 * @param {NodeJS.ReadableStream} buildStream - The Docker build stream.
 * @returns {Promise<string>} A promise that resolves to the Docker image ID once the build is complete.
 */
const followImageProgressAndRetrieveImageID = async (
  imageName: string, dockerode: Dockerode, buildStream: NodeJS.ReadableStream
): Promise<string> => new Promise((resolve, reject) => {
  dockerode.modem.followProgress(
    buildStream,
    // The callback function triggered when the progress is complete
    (buildStreamErr: Error | null, buildStreamRes: DockerBuildStreamResult[] | null) => {
      try {
        const execErrMessage = buildStreamRes ? buildStreamRes.find(({ error }) => !!error) : null;

        if (buildStreamErr || execErrMessage) { // Failure
          reject(buildStreamErr || new Error(execErrMessage?.error));
        } else { // Success
          resolve(extractImageIDFromStreamResult(buildStreamRes)); // Retrieve the image ID
        }
      } catch (err: Error | unknown) {
        reject(err);
      }
    },
    // The callback function triggered at each step
    ({ stream: stepStream }: DockerBuildStreamResult) => {
      try {
        if (stepStream && /^Step \d+\/\d+ : .+$/.test(stepStream)) Logger.info(`[${imageName}] ${stepStream}`);
      } catch (err: Error | unknown) {
        reject(err);
      }
    }
  );
});

/**
 * Creates a Docker image from a directory.
 *
 * @param {string} imageName - The name of the Docker image to create.
 * @param {string} dirPath - The path to the directory containing the Dockerfile.
 * @returns {Promise<IDockerImage>} A promise that resolves to IDockerImage.
 */
const createImage = async (imageName: string, dirPath: string): Promise<IDockerImage> => {
  // Record start time and start Dockerode
  const startTime = Date.now();
  const dockerode = new Dockerode({ socketPath: Constants.DOCKER_SOCKET_PATH });

  try {
    Logger.info(`Creating a Docker image named ${imageName}.`);

    // Build the Docker image
    const buildStream = await dockerode.buildImage({
      context: (() => {
        fsUtils.checkIfFileExists(dirPath, Constants.PROJECT_FILES.DOCKERFILE); // Check if the Dockerfile exists before attempting to build the image
        return dirPath;
      })(),
      src: Constants.PROJECT_DOCKER_IMAGE_SRC
    }, { t: imageName });

    // Follow the process of image creation and retrieve the image information
    const imageID = await followImageProgressAndRetrieveImageID(imageName, dockerode, buildStream);
    const imageSizeMB = await dockerode.getImage(imageID).inspect()
      .then(({ Size }) => conversionUtils.convertBytesToMB(Size));

    // Calculate elapsed time in seconds
    const imageBuildTimeSeconds = conversionUtils.convertMillisecondsToSeconds(Date.now() - startTime);

    Logger.info(`Created a Docker image named '${imageName}' using ${imageSizeMB} MB of disk space (ID: ${imageID}).`);
    return { imageID, imageName, imageBuildTimeSeconds, imageSizeMB } as IDockerImage;
  } catch (err: Error | unknown) {
    // Try to remove the docker image if created
    await removeImage(imageName, { dockerode });

    Logger.error(`Could not create a Docker image named '${imageName}'! (Error: ${(err as Error)?.message})`);
    throw err;
  } finally {
    // Prune unused containers and images
    await pruneUnused(dockerode);
  }
};

/**
 * Creates a Docker container with optional source files copied into it.
 *
 * @param {Dockerode} dockerode - The Dockerode instance.
 * @param {string} imageName - The name of the Docker image.
 * @param {string[]} command - The command to run inside the container.
 * @param {string} [srcDirPath] - The path to the source directory to copy into the container.
 * @returns {Promise<ContainerType>} A promise that resolves to the created Docker container.
 */
const createContainerWithFiles = async (
  dockerode: Dockerode, imageName: string, command: string[], srcDirPath?: string
): Promise<ContainerType> => {
  // Create the container
  const container = await dockerode.createContainer({ Image: imageName, Cmd: command, Tty: true });

  // Move source files into the copy container
  if (srcDirPath) {
    await container.putArchive(
      fsUtils.createTarball(srcDirPath),
      { path: `${Constants.PROJECT_DIR}/${Constants.PROJECT_FOLDERS.SRC}` }
    );
  }

  return container;
};

/**
 * Handles a Docker container timeout by potentially killing the container and returning the result.
 *
 * @param {ContainerType} container - The Docker container that may need to be killed.
 * @param {number} timeout - The maximum execution time allowed before considering a timeout (in seconds).
 * @param {boolean} timeoutActive - A boolean flag indicating whether the timeout is still active.
 * @returns {Promise<DockerContainerExecutionOutput>} A promise that resolves with the result of handling the container timeout,
 *                                              including exit status, execution time, and a timeout message,
 *                                              or rejects if there's an error.
 */
const handleContainerTimeout = async (
  container: ContainerType, timeout: number, timeoutActive: boolean
): Promise<DockerContainerExecutionOutput> => {
  const message = `Container execution timed out after ${timeout} seconds.`;

  // Check if the timeout is still active, as it's possible that the execution has already completed before this runs
  if (timeoutActive) {
    try {
      Logger.error(message);
      await container.kill();
    } catch (err) {
      // This situation should not occur ideally; attempt to find a way to terminate the container
      Logger.warn(`Could not stop the container! (Reason: ${(err as Error)?.message})`);
    }
  }

  return { statusCode: DockerExitCode.IMMEDIATE_TERMINATION, executionTimeSeconds: timeout, output: message };
};

/**
 * Starts a Docker container and waits for it to complete execution.
 *
 * @param {Dockerode} dockerode - The Dockerode instance.
 * @param {ContainerType} container - The Docker container to start.
 * @param {object} [options] - Optional options.
 * @param {number} [options.timeout] - Timeout in seconds for container execution.
 * @returns {Promise<DockerContainerExecutionOutput>} A promise that resolves to the execution results and container output.
 */
const startContainer = async (
  dockerode: Dockerode, container: ContainerType, options?: { timeout?: number; }
): Promise<DockerContainerExecutionOutput> => {
  let timeoutActive = !!options?.timeout;

  const promises: Promise<DockerContainerExecutionOutput>[] = []; // Promises to run concurrently, racing to complete first
  const startTime = Date.now(); // Start time

  // Create a promise that starts the Docker container and waits for it to complete execution
  promises.push(container.start().then(() => container.wait().then(({ StatusCode }) => {
    timeoutActive = false; // Deactivate the timeout (see handleContainerTimeout function)

    // Return the results
    return container.logs({ stdout: true, stderr: true }).then((buffer) => ({
      statusCode: StatusCode,
      executionTimeSeconds: conversionUtils.convertMillisecondsToSeconds(Date.now() - startTime),
      output: buffer.toString()
    }));
  })));

  // If a timeout value is provided, create also a timeout promise that triggers after the specified number of seconds
  if (options?.timeout) {
    promises.push(new Promise((resolve) => setTimeout(() => (
      resolve(handleContainerTimeout(container, options!.timeout!, timeoutActive)) // Handle container timeout
    ), options!.timeout! * 1000)));
  }

  // Resolve with the results if the container finishes before the timeout value; otherwise, reject with a timeout error.
  return Promise.race(promises);
};

/**
 * Runs a Docker container from the specified image with the given command.
 *
 * @param {string} execName - The name of the execution.
 * @param {string} imageName - The name of the Docker image from which the container will be spawned.
 * @param {string} cmdString - The command to be executed.
 * @param {object} [options] - Optional parameters for configuring the container execution.
 * @param {string} [options.srcDirPath] - The source directory path to bind as a volume.
 * @param {number} [options.timeout=Constants.DOCKER_CONTAINER_TIMEOUT_DEFAULT] - The maximum duration (in seconds)
 *                                                                                for the container execution.
 * @returns {Promise<IDockerContainerResults>} A promise that resolves to an object containing the results.
 */
const runImage = async (
  execName: string, imageName: string, cmdString: string,
  { srcDirPath, timeout = Constants.DOCKER_CONTAINER_TIMEOUT_DEFAULT }: { srcDirPath?: string; timeout?: number; } = {}
): Promise<IDockerContainerResults> => {
  const dockerode = new Dockerode({ socketPath: Constants.DOCKER_SOCKET_PATH });

  let container;
  let containerResults: IDockerContainerResults = { containerName: null, cmd: cmdString, timeoutValue: timeout, output: {} };

  try {
    Logger.info(`Running a Docker container from '${imageName}' image with the command '${cmdString}' (${execName}).`);

    // Create and start the container
    container = await createContainerWithFiles(dockerode, imageName, cmdString.split(' '), srcDirPath);
    const { statusCode, executionTimeSeconds, output: stdOutput } = await startContainer(dockerode, container, { timeout });
    const containerName = await container.inspect().then(({ Name }) => Name.slice(1)); // Container name without the leading slash

    // Add the results to the container results object
    containerResults = {
      ...containerResults,
      containerName,
      statusCode: (Object.values(DockerExitCode).includes(statusCode)) ? statusCode : DockerExitCode.APPLICATION_ERROR,
      executionTimeSeconds
    };
    containerResults.output = statusCode === DockerExitCode.PURPOSELY_STOPPED ? { data: stdOutput } : { error: stdOutput };

    Logger.info(`${imageName}/${containerName} container exited with code ${statusCode} (Elapsed time: ${executionTimeSeconds} seconds).`);
    return containerResults;
  } catch (err: Error | unknown) {
    Logger.error(`Could not run a Docker container from '${imageName}' image with the command '${cmdString}' (${execName}).`);
    return { ...containerResults, statusCode: DockerExitCode.FAILED_TO_RUN, output: { error: (err as Error)?.message } };
  } finally {
    // Remove the container
    try {
      await container?.remove();
    } catch (err: Error | unknown) {
      Logger.warn(`Could not remove the container '${containerResults.containerName}' after running it.`);
    }
  }
};

export default { ensureDockerDaemonAccessibility, removeImage, createImage, runImage };
