import Dockerode = require('dockerode'); // https://github.com/apocas/dockerode
import streams = require('memory-streams'); // Streams to capture stdout and stderr

import Status from '../models/enums/status';
import { IDockerImage } from '../models/docker-image';
import { IDockerContainerHistory } from '../models/docker-container-history';

import Logger from '../logging/logger';

import constantUtils from './constant-utils';
import conversionUtils from './conversion-utils';
import fsUtils from './fs-utils';

/**
 * Extracts the image ID from a Docker build stream result.
 *
 * @param {object[] | null} streamRes - An array of stream results from Docker build.
 * @returns {string | any} The extracted Docker image ID.
 * @throws {Error} If ID cannot be extracted
 */
const extractImageIDFromStreamResult = (streamRes: object[] | null): string | any => {
  try {
    const match = streamRes?.map(({ stream }: any) => stream).join('').match(/Successfully built ([a-f0-9]+)/);
    return match ? match[1] : null;
  } catch (err) {
    throw new Error('An error occurred while extracting the image ID from stream.');
  }
};

/**
 * Prunes unused Docker containers and images.
 *
 * @param {Dockerode} dockerode - The Dockerode instance.
 * @returns {Promise<void>} A promise that resolves once the pruning is complete.
 */
const pruneDocker = async (dockerode: Dockerode): Promise<void> => {
  Logger.info('Pruning unused containers and images..');

  // Prune unused containers and images
  await dockerode.pruneContainers();
  await dockerode.pruneImages();

  Logger.info('Pruned unused containers and images!');
};

/**
 * Removes a Docker volume by name.
 *
 * @param {Dockerode} dockerode - The Dockerode instance.
 * @param {string} volumeName - The name of the Docker volume to remove.
 * @returns {Promise<void>} A promise that resolves once the volume is removed.
 */
const removeVolume = async (
  dockerode: Dockerode, volumeName: string
): Promise<void> => dockerode.getVolume(volumeName).remove();

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
    (buildStreamErr: Error | null, buildStreamRes: any[] | null) => {
      const execErr = buildStreamRes ? buildStreamRes.find(({ error }: any) => !!error) : null;

      if (buildStreamErr || execErr) { // Failure
        reject(new Error(buildStreamErr || execErr.error));
      } else { // Success
        resolve(extractImageIDFromStreamResult(buildStreamRes)); // Retrieve the image ID
      }
    },
    // The callback function triggered at each step
    ({ stream: stepStream }: any) => {
      if (/^Step \d+\/\d+ : .+$/.test(stepStream)) Logger.info(stepStream);
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
      .then(({ Size }: any) => conversionUtils.convertBytesToMB(Size));

    // Calculate elapsed time in seconds
    const imageBuildTimeSeconds = conversionUtils.convertMillisecondsToSeconds(Date.now() - startTime);

    Logger.info(`Created a Docker image named '${imageName}' using ${imageSizeMB} MB of disk space (ID: ${imageID}).`);
    return { imageID, imageName, imageBuildTimeSeconds, imageSizeMB } as IDockerImage;
  } catch (err: Error | any) {
    Logger.error(`Could not create a Docker image named '${imageName}'! (Error: ${err.message || null})`);
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
 * @param {boolean} [pruned=false] - Indicates whether to remove the volume if pruned.
 * @returns {Promise<string>} A promise that resolves to the name of the created shared volume.
 */
const createSharedVolume = async (
  dockerode: Dockerode, execName: string, srcDirPath: string, pruned: boolean = false
): Promise<string> => {
  // Create a shared volume
  const sharedVolume = `sharedvolume_${execName}`;
  await dockerode.createVolume({ Name: sharedVolume });

  // Create the copy container
  let copyContainer: Dockerode.Container;
  try {
    copyContainer = await dockerode.createContainer({
      Image: 'ubuntu', WorkingDir: '/app', HostConfig: { Binds: [`${sharedVolume}:/app`] }
    });
  } catch (err: Error | any) {
    await removeVolume(dockerode, sharedVolume); // Remove the shared volume
    throw err;
  }

  // Move source files into the copy container (consequently into the shared volume)
  try {
    await copyContainer.putArchive(fsUtils.createTarball(srcDirPath), { path: '/app' });
  } finally {
    if (pruned) {
      await copyContainer.remove(); // Remove the copy container
    }
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
    const [stdout, stderr] = [new streams.WritableStream(), new streams.WritableStream()];
    const [{ StatusCode }, container] = await dockerode.run(
      imageName,
      dockerContainerHistory.commandExecuted.split(' '),
      [stdout, stderr],
      {
        Tty: false,
        HostConfig: { Binds: srcDirPath ? [`${sharedVolume}:${constantUtils.PROJECT_DIR}/${constantUtils.PROJECT_FOLDERS.SRC}`] : [] }
      }
    );

    // Extract the results and update the object
    dockerContainerHistory.containerName = await container.inspect().then(({ Name }: any) => Name.substr(1)); // Get the container name without the leading slash
    dockerContainerHistory.status = StatusCode === 0 ? Status.SUCCESS : Status.FAILURE; // Status code being 0 means a successful execution
    dockerContainerHistory.statusCode = StatusCode;
    dockerContainerHistory.executionTimeSeconds = conversionUtils.convertMillisecondsToSeconds(Date.now() - startTime); // Calculate elapsed time in seconds
    dockerContainerHistory.output = StatusCode === 0 ? { data: stdout.toString() } : { error: stderr.toString() };

    Logger.info(`The Docker container '${dockerContainerHistory.containerName}' running from the '${imageName}' image exited with code ${StatusCode} (Elapsed time: ${dockerContainerHistory.executionTimeSeconds} seconds).`);
    return dockerContainerHistory;
  } catch (err: Error | any) {
    Logger.error(`Could not run a Docker container from '${imageName}' image with the command '${dockerContainerHistory.commandExecuted}'.`);
    throw err;
  } finally {
    await pruneDocker(dockerode); // Prune unused containers and images

    if (sharedVolume) {
      await removeVolume(dockerode, sharedVolume); // Remove the shared volume
    }
  }
};

export default { createImage, runImage };
