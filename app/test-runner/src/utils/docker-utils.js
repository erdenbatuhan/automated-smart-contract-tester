const fs = require('fs');
const path = require('path');
const Dockerode = require('dockerode'); // https://github.com/apocas/dockerode
const streams = require('memory-streams'); // Streams to capture stdout and stderr

const Logger = require('../logging/logger');

const constantUtils = require('./constant-utils');
const conversionUtils = require('./conversion-utils');

const getDockerContext = (projectDirPath) => {
  const dockerfilePath = path.join(projectDirPath, 'Dockerfile');

  // Check if the Dockerfile exists before attempting to build the image
  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(`Dockerfile not found at ${dockerfilePath}`);
  }

  return path.dirname(dockerfilePath);
};

const extractImageIDFromStreamResult = (streamRes) => streamRes.map(({ stream }) => stream)
  .join('').match(/Successfully built ([a-f0-9]+)/)[1];

const pruneDocker = async (dockerode) => {
  Logger.info('Pruning unused containers and images..');

  // Prune unused containers and images
  await dockerode.pruneContainers();
  await dockerode.pruneImages();

  Logger.info('Pruned unused containers and images!');
};

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
    ({ stepStream }) => { if (/^Step \d+\/\d+ : .+$/.test(stepStream)) Logger.info(stepStream); }
  );
});

const createImage = async (projectName, projectDirPath) => {
  try {
    Logger.info(`Creating the Docker image for the project ${projectName}..`);

    // Record start time and start Dockerode
    const startTime = new Date();
    const dockerode = new Dockerode();

    // Build the Docker image
    const buildStream = await dockerode.buildImage({
      context: getDockerContext(projectDirPath),
      src: constantUtils.DOCKER_IMAGE_SRC
    }, { t: projectName });

    // Follow the process of image creation and retrieve the image information
    const dockerImageID = await followImageProgressAndRetrieveImageID(dockerode, buildStream);
    const dockerImageSizeMB = await dockerode.getImage(dockerImageID).inspect()
      .then(({ Size }) => conversionUtils.convertBytesToMB(Size));

    // Calculate elapsed time in seconds and prune unused containers and images
    const elapsedTimeSeconds = conversionUtils.convertMillisecondsToSeconds(new Date() - startTime);
    await pruneDocker(dockerode);

    Logger.info(`Created the Docker image (${dockerImageID}) allocating ${dockerImageSizeMB} MB for the project ${projectName}!`);
    return {
      dockerImageName: projectName,
      dockerImageID,
      dockerImageBuildTimeSeconds: elapsedTimeSeconds,
      dockerImageSizeMB
    };
  } catch (err) {
    Logger.error(`Could not create the Docker image for the project ${projectName}! (Error: ${err.message || null})`);
    throw err;
  }
};

const runContainer = async (projectName, cmd, srcDirPath = null) => {
  Logger.info(`Running a Docker container for ${projectName} with the command '${cmd.join(' ')}'..`);

  const [stdout, stderr] = [new streams.WritableStream(), new streams.WritableStream()];
  const startTime = new Date(); // Record start time

  return new Dockerode().run(projectName, cmd, [stdout, stderr], {
    Tty: false,
    HostConfig: {
      Binds: srcDirPath ? [`${srcDirPath}:/app/src`] : []
    }
  }).then(async ([{ StatusCode }, container]) => {
    const dockerContainer = {
      containerName: await container.inspect().then(({ Name }) => Name.substr(1)), // Get the container name without the leading slash
      elapsedTimeSeconds: conversionUtils.convertMillisecondsToSeconds(new Date() - startTime) // Calculate elapsed time in seconds
    };

    // Remove the container
    await container.remove();

    Logger.info(
      `${projectName}'s Docker container (${dockerContainer.containerName}) exited with code: ${StatusCode} `
      + `(Elapsed time: ${dockerContainer.elapsedTimeSeconds} seconds)`
    );

    if (StatusCode === 0) { // Status code being 0 means a successful execution
      return [dockerContainer, stdout.toString()];
    }

    throw new Error(stderr.toString());
  }).catch((err) => {
    Logger.error(`Could not run the Docker container for ${projectName} with the command '${cmd.join(' ')}'!`);
    throw err;
  });
};

module.exports = { createImage, runContainer };
