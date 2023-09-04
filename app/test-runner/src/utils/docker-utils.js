const Dockerode = require('dockerode'); // https://github.com/apocas/dockerode
const streams = require('memory-streams'); // Streams to capture stdout and stderr

const Status = require('../models/enums/status');

const Logger = require('../logging/logger');

const constantUtils = require('./constant-utils');
const conversionUtils = require('./conversion-utils');
const fsUtils = require('./fs-utils');

/**
 * Extracts the image ID from a Docker build stream result.
 *
 * @param {Object[]} streamRes - An array of stream results from Docker build.
 * @returns {String} The extracted Docker image ID.
 */
const extractImageIDFromStreamResult = (streamRes) => streamRes.map(({ stream }) => stream)
  .join('').match(/Successfully built ([a-f0-9]+)/)[1];

/**
 * Prunes unused Docker containers and images.
 *
 * @param {Dockerode} dockerode - The Dockerode instance.
 * @returns {Promise<void>} A promise that resolves once the pruning is complete.
 */
const pruneDocker = async (dockerode) => {
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
 * @param {String} volumeName - The name of the Docker volume to remove.
 * @returns {Promise<void>} A promise that resolves once the volume is removed.
 */
const removeVolume = async (dockerode, volumeName) => dockerode.getVolume(volumeName).remove();

/**
 * Follows the progress of a Docker image build and retrieves the image ID.
 *
 * @param {Dockerode} dockerode - The Dockerode instance.
 * @param {ReadableStream} buildStream - The Docker build stream.
 * @returns {Promise<String>} A promise that resolves to the Docker image ID once the build is complete.
 */
const followImageProgressAndRetrieveImageID = async (dockerode, buildStream) => new Promise((resolve, reject) => {
  dockerode.modem.followProgress(
    buildStream,
    // The callback function triggered when the progress is complete
    (buildStreamErr, buildStreamRes) => {
      const execErr = buildStreamRes ? buildStreamRes.find(({ error }) => !!error) : null;

      if (buildStreamErr || execErr) { // Failure
        reject(new Error(buildStreamErr || execErr.error));
      } else { // Success
        resolve(extractImageIDFromStreamResult(buildStreamRes)); // Retrieve the image ID
      }
    },
    // The callback function triggered at each step
    ({ stream: stepStream }) => { if (/^Step \d+\/\d+ : .+$/.test(stepStream)) Logger.info(stepStream); }
  );
});

/**
 * Creates a Docker image from a directory.
 *
 * @param {String} imageName - The name of the Docker image to create.
 * @param {String} dirPath - The path to the directory containing the Dockerfile.
 * @returns {Promise<Object>} A promise that resolves to an object with image information.
 */
const createImage = async (imageName, dirPath) => {
  // Record start time and start Dockerode
  const startTime = new Date();
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
    const imageBuildTimeSeconds = conversionUtils.convertMillisecondsToSeconds(new Date() - startTime);

    Logger.info(`Created a Docker image named '${imageName}' using ${imageSizeMB} MB of disk space (ID: ${imageID}).`);
    return { imageID, imageName, imageBuildTimeSeconds, imageSizeMB };
  } catch (err) {
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
 * @param {String} execName - The unique name of the execution.
 * @param {String} srcDirPath - The path to the source directory to be moved into the volume.
 * @param {Boolean} [pruned=false] - Indicates whether to remove the volume if pruned.
 * @returns {Promise<String>} A promise that resolves to the name of the created shared volume.
 */
const createSharedVolume = async (dockerode, execName, srcDirPath, pruned = false) => {
  // Create a shared volume
  const sharedVolume = `sharedvolume_${execName}`;
  await dockerode.createVolume({ Name: sharedVolume });

  // Create the copy container
  let copyContainer;
  try {
    copyContainer = await dockerode.createContainer({
      Image: 'ubuntu', WorkingDir: '/app', HostConfig: { Binds: [`${sharedVolume}:/app`] }
    });
  } catch (err) {
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
 * Runs a Docker container with the specified image and command.
 *
 * @param {String} execName - The unique name of the execution.
 * @param {String} imageName - The name of the Docker image.
 * @param {String} cmd - The command to run in the container.
 * @param {String} [srcDirPath] - The path to the source directory to bind-mount into the container.
 * @returns {Promise<Object>} A promise that resolves to the Docker container information and output.
 */
const runContainer = async (execName, imageName, cmd, srcDirPath = undefined) => {
  // Record start time and start Dockerode
  const startTime = new Date();
  const dockerode = new Dockerode({ socketPath: constantUtils.DOCKER_SOCKET_PATH });

  let sharedVolume;
  try {
    Logger.info(`Running a Docker container from '${imageName}' image with the command '${cmd}'.`);

    // Create a shared volume for binding the src directory
    sharedVolume = srcDirPath && await createSharedVolume(dockerode, execName, srcDirPath);

    // Run the docker container
    const [stdout, stderr] = [new streams.WritableStream(), new streams.WritableStream()];
    const [{ StatusCode }, container] = await dockerode.run(imageName, cmd.split(' '), [stdout, stderr], {
      Tty: false,
      HostConfig: { Binds: srcDirPath && [`${sharedVolume}:${constantUtils.PROJECT_DIR}/${constantUtils.PROJECT_FOLDERS.SRC}`] }
    });

    // Extract the results
    const dockerContainer = {
      containerName: await container.inspect().then(({ Name }) => Name.substr(1)), // Get the container name without the leading slash
      commandExecuted: cmd,
      status: StatusCode === 0 ? Status.SUCCESS : Status.FAILURE, // Status code being 0 means a successful execution
      statusCode: StatusCode,
      executionTimeSeconds: conversionUtils.convertMillisecondsToSeconds(new Date() - startTime) // Calculate elapsed time in seconds
    };

    Logger.info(`The Docker container '${dockerContainer.containerName}' running from the '${imageName}' image exited with code ${StatusCode} (Elapsed time: ${dockerContainer.executionTimeSeconds} seconds).`);
    return { ...dockerContainer, output: StatusCode === 0 ? stdout.toString() : { error: stderr.toString() } };
  } catch (err) {
    Logger.error(`Could not run a Docker container from '${imageName}' image with the command '${cmd}'!`);
    throw err;
  } finally {
    await pruneDocker(dockerode); // Prune unused containers and images

    if (sharedVolume) {
      await removeVolume(dockerode, sharedVolume); // Remove the shared volume
    }
  }
};

module.exports = { createImage, runContainer };
