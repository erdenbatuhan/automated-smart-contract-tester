const Dockerode = require('dockerode'); // https://github.com/apocas/dockerode
const streams = require('memory-streams'); // Streams to capture stdout and stderr

const Status = require('../models/enums/status');

const Logger = require('../logging/logger');

const constantUtils = require('./constant-utils');
const conversionUtils = require('./conversion-utils');
const fsUtils = require('./fs-utils');

const extractImageIDFromStreamResult = (streamRes) => streamRes.map(({ stream }) => stream)
  .join('').match(/Successfully built ([a-f0-9]+)/)[1];

const pruneDocker = async (dockerode) => {
  Logger.info('Pruning unused containers and images..');

  // Prune unused containers and images
  await dockerode.pruneContainers();
  await dockerode.pruneImages();

  Logger.info('Pruned unused containers and images!');
};

const removeVolume = async (dockerode, volumeName) => dockerode.getVolume(volumeName).remove();

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

const createSharedVolume = async (dockerode, { execName, srcDirPath }, pruned = false) => {
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

const runContainer = async (execName, imageName, cmd, srcDirPath = undefined) => {
  // Record start time and start Dockerode
  const startTime = new Date();
  const dockerode = new Dockerode({ socketPath: constantUtils.DOCKER_SOCKET_PATH });

  let sharedVolume;
  try {
    Logger.info(`Running a Docker container from '${imageName}' image with the command '${cmd}'.`);

    // Create a shared volume for binding the src directory
    sharedVolume = srcDirPath && await createSharedVolume(dockerode, { execName, srcDirPath });

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
