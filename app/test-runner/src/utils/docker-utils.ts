/* eslint-disable @typescript-eslint/space-before-blocks */
import Dockerode from 'dockerode';
import type { Container as ContainerType } from 'dockerode';
import { WritableStream } from 'memory-streams'; // Streams to capture stdout and stderr

import Logger from '@logging/logger';

import Status from '@models/enums/status';
import type { IDockerImage } from '@models/docker-image';
import type { IDockerContainerHistory } from '@models/docker-container-history';

import constantUtils from '@utils/constant-utils';
import conversionUtils from '@utils/conversion-utils';
import fsUtils from '@utils/fs-utils';

interface BuildStreamResult {
  error?: string;
  stream?: string;
}

/**
 * Extracts the image ID from a Docker build stream result.
 *
 * @param {object[] | null} streamRes - An array of stream results from Docker build.
 * @returns {string} The extracted Docker image ID.
 * @throws {Error} If ID cannot be extracted
 */
const extractImageIDFromStreamResult = (streamRes: BuildStreamResult[] | null): string => {
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
 * @returns {Promise<void>} A promise that resolves once the pruning is complete.
 */
const pruneDocker = async (dockerode: Dockerode): Promise<void> => {
  try {
    Logger.info('Pruning unused containers and images..');

    // Prune unused containers and images
    await dockerode.pruneContainers();
    await dockerode.pruneImages();

    Logger.info('Pruned unused containers and images!');
  } catch (err: Error | unknown) {
    Logger.error(`An error occurred while pruning! (Error: ${(err as Error)?.message})`);
    throw err;
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
  imageName: string, { dockerode, shouldPrune = false }: { dockerode?: Dockerode, shouldPrune?: boolean }
): Promise<void> => {
  const dockerodeInstance = dockerode || new Dockerode({ socketPath: constantUtils.DOCKER_SOCKET_PATH });

  try {
    Logger.info(`Removing the Docker image named '${imageName}'.`);

    const dockerImage = dockerodeInstance.getImage(imageName);
    if (dockerImage) await dockerImage.remove();

    Logger.info(`Successfully removed the Docker image named '${imageName}'.`);
  } catch (err: Error | unknown) {
    Logger.error(`Could not remove the Docker image named '${imageName}'. (Error: ${(err as Error)?.message})`);
  } finally {
    if (shouldPrune) await pruneDocker(dockerodeInstance); // Prune Docker
  }
};

/**
 * Removes a Docker volume by name.
 *
 * @param {Dockerode} dockerode - The Dockerode instance.
 * @param {object} options - An options object.
 * @param {Dockerode} [options.dockerode] - The Dockerode instance. If not provided, a new instance will be created with the default socket path.
 * @param {boolean} [options.shouldPrune=false] - Indicates whether to prune unused containers and images after the removal.
 * @returns {Promise<void>} A promise that resolves once the volume is removed.
 */
const removeVolume = async (
  volumeName: string, { dockerode, shouldPrune = false }: { dockerode?: Dockerode, shouldPrune?: boolean }
): Promise<void> => {
  const dockerodeInstance = dockerode || new Dockerode({ socketPath: constantUtils.DOCKER_SOCKET_PATH });

  try {
    Logger.info(`Removing the Docker volume named '${volumeName}'.`);

    const dockerVolume = dockerodeInstance.getVolume(volumeName);
    if (dockerVolume) await dockerVolume.remove();

    Logger.info(`Successfully removed the Docker volume named '${volumeName}'.`);
  } catch (err: Error | unknown) {
    Logger.error(`Could not remove the Docker volume named '${volumeName}'. (Error: ${(err as Error)?.message})`);
  } finally {
    if (shouldPrune) await pruneDocker(dockerodeInstance); // Prune Docker
  }
};

/**
 * Follows the progress of a Docker image build and retrieves the image ID.
 *
 * @param {Dockerode} dockerode - The Dockerode instance.
 * @param {NodeJS.ReadableStream} buildStream - The Docker build stream.
 * @returns {Promise<string>} A promise that resolves to the Docker image ID once the build is complete.
 */
const followImageProgressAndRetrieveImageID = async (
  dockerode: Dockerode, buildStream: NodeJS.ReadableStream
): Promise<string> => new Promise((resolve, reject) => {
  dockerode.modem.followProgress(
    buildStream,
    // The callback function triggered when the progress is complete
    (buildStreamErr: Error | null, buildStreamRes: BuildStreamResult[] | null) => {
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
    ({ stream: stepStream }: BuildStreamResult) => {
      try {
        if (stepStream && /^Step \d+\/\d+ : .+$/.test(stepStream)) Logger.info(stepStream);
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
  const dockerode = new Dockerode({ socketPath: constantUtils.DOCKER_SOCKET_PATH });

  try {
    Logger.info(`Creating a Docker image named ${imageName}.`);

    // Build the Docker image
    const buildStream = await dockerode.buildImage({
      context: (() => {
        fsUtils.checkIfFileExists(dirPath, 'Dockerfile'); // Check if the Dockerfile exists before attempting to build the image
        return dirPath;
      })(),
      src: constantUtils.DOCKER_IMAGE_SRC
    }, { t: imageName });

    // Follow the process of image creation and retrieve the image information
    const imageID = await followImageProgressAndRetrieveImageID(dockerode, buildStream);
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
    await pruneDocker(dockerode);
  }
};

/**
 * Creates a shared volume for a Docker container and moves source files into it.
 *
 * @param {Dockerode} dockerode - The Dockerode instance.
 * @param {string} execName - The unique name of the execution.
 * @param {string} srcDirPath - The path to the source directory to be moved into the volume.
 * @param {boolean} [removeAfter=false] - Indicates whether to remove the container after the copy operation.
 * @returns {Promise<string>} A promise that resolves to the name of the created shared volume.
 */
const createSharedVolume = async (
  dockerode: Dockerode, execName: string, srcDirPath: string, removeAfter: boolean = false
): Promise<string> => {
  // Create a shared volume
  const sharedVolume = `sharedvolume_${execName}`;
  await dockerode.createVolume({ Name: sharedVolume });

  // Create the copy container
  let copyContainer: ContainerType;
  try {
    copyContainer = await dockerode.createContainer({
      Image: 'ubuntu', WorkingDir: '/app', HostConfig: { Binds: [`${sharedVolume}:/app`] }
    });
  } catch (err: Error | unknown) {
    await removeVolume(sharedVolume, { dockerode }); // Remove the shared volume
    throw err;
  }

  // Move source files into the copy container (consequently into the shared volume)
  try {
    await copyContainer.putArchive(fsUtils.createTarball(srcDirPath), { path: '/app' });
  } finally {
    // Remove the copy container
    if (removeAfter) await copyContainer.remove();
  }

  return sharedVolume;
};

/**
 * Runs a Docker container from the specified image with the given command.
 *
 * @param {string} execName - The name of the execution.
 * @param {string} imageName - The name of the Docker image from which the container will be spawned.
 * @param {IDockerContainerHistory} dockerContainerHistory - The Docker container history object.
 * @param {string} [srcDirPath] - The source directory path to bind as a volume.
 * @returns {Promise<IDockerContainerHistory>} A promise that resolves to the updated Docker container history.
 * @throws {Error} If an error occurs during container execution.
 */
const runImage = async (
  execName: string, imageName: string, dockerContainerHistory: IDockerContainerHistory, srcDirPath?: string
): Promise<IDockerContainerHistory> => {
  // Record start time and start Dockerode
  const startTime = Date.now();
  const dockerode = new Dockerode({ socketPath: constantUtils.DOCKER_SOCKET_PATH });

  let sharedVolume: string | undefined;
  try {
    Logger.info(`Running a Docker container from '${imageName}' image with the command '${dockerContainerHistory.commandExecuted}'.`);

    // Create a shared volume for binding the src directory
    sharedVolume = srcDirPath && await createSharedVolume(dockerode, execName, srcDirPath);

    // Run the docker container
    const [stdout, stderr] = [new WritableStream(), new WritableStream()];
    const [{ StatusCode }, container]: [{ StatusCode: number }, ContainerType] = await dockerode.run(
      imageName,
      dockerContainerHistory.commandExecuted.split(' '),
      [stdout, stderr],
      {
        Tty: false,
        HostConfig: { Binds: srcDirPath ? [`${sharedVolume}:${constantUtils.PROJECT_DIR}/${constantUtils.PROJECT_FOLDERS.SRC}`] : [] }
      }
    );

    // Extract the results and update the object
    dockerContainerHistory.containerName = await container.inspect().then(({ Name }) => Name.slice(1)); // Get the container name without the leading slash
    dockerContainerHistory.status = StatusCode === 0 ? Status.SUCCESS : Status.FAILURE; // Status code being 0 means a successful execution
    dockerContainerHistory.statusCode = StatusCode;
    dockerContainerHistory.executionTimeSeconds = conversionUtils.convertMillisecondsToSeconds(Date.now() - startTime); // Calculate elapsed time in seconds
    dockerContainerHistory.output = StatusCode === 0 ? { data: stdout.toString() } : { error: stderr.toString() };

    Logger.info(`The Docker container '${dockerContainerHistory.containerName}' running from the '${imageName}' image exited with code ${StatusCode} (Elapsed time: ${dockerContainerHistory.executionTimeSeconds} seconds).`);
    return dockerContainerHistory;
  } catch (err: Error | unknown) {
    Logger.error(`Could not run a Docker container from '${imageName}' image with the command '${dockerContainerHistory.commandExecuted}'.`);
    throw err;
  } finally {
    // Prune unused containers and images
    await pruneDocker(dockerode);

    // Remove the shared volume
    if (sharedVolume) await removeVolume(sharedVolume, { dockerode });
  }
};

export default { removeImage, createImage, runImage };
