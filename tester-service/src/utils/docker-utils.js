const fs = require("fs");
const path = require("path");
const Dockerode = require("dockerode"); // https://github.com/apocas/dockerode

// Streams to capture stdout and stderr
const streams = require("memory-streams")
const stdout = new streams.WritableStream()
const stderr = new streams.WritableStream()

const logger = require("./logger-utils");
const constantUtils = require("./constant-utils");

const getDockerContext = (projectName) => {
  const dockerfilePath = path.join(constantUtils.PATH_PROJECTS_DIR, projectName, "Dockerfile");

  // Check if the Dockerfile exists before attempting to build the image
  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(`Dockerfile not found at ${dockerfilePath}`);
  }

  return path.dirname(dockerfilePath);
};

const extractImageIdFromStreamResult = (streamRes) => streamRes.map(({ stream }) => stream).join("").match(/Successfully built ([a-f0-9]+)/)[1];

const createDockerImage = (projectName) => {
  logger.info(`Creating the Docker image for the project ${projectName}..`);
  const dockerode = new Dockerode();

  return new Promise(async (resolve, reject) => {
    // Create the Docker image
    let stream;
    try {
      stream = await dockerode.buildImage({
        context: getDockerContext(projectName),
        src: constantUtils.DOCKER_IMAGE_SRC
      }, { t: projectName });
    } catch (err) {
      return reject(err);
    }

    // Follow the process of creating the image 
    dockerode.modem.followProgress(stream,
      // The callback function triggered when the progress is complete
      (streamErr, streamRes) => {
        const execErr = streamRes ? streamRes.find(({ error }) => !!error) : null;
        if (streamErr || execErr) {
          return reject(new Error(streamErr || execErr.error)); // On Error
        }

        resolve(extractImageIdFromStreamResult(streamRes)); // On Success
      },
      // The callback function triggered at each step
      ({ stream }) => {
        if (/^Step \d+\/\d+ : .+$/.test(stream)) {
          logger.info(stream);
        }
      }
    );
  }).then((imageId) => {
    logger.info(`Created the Docker image (${imageId}) for the project ${projectName}!`);
    return imageId;
  }).catch(err => {
    logger.error(`Could not create the Docker image for the project ${projectName}! (Error: ${err.message || null})`);
    throw err;
  }).finally(async () => {
    logger.info(`Pruning unused containers and images..`);

    // Prune unused containers and images
    await dockerode.pruneContainers();
    await dockerode.pruneImages();

    logger.info(`Pruned unused containers and images!`);
  });
};

const runDockerContainer = async (projectName, cmd, srcFolder) => {
  logger.info(`Running a Docker container for ${projectName} with the command '${cmd.join(" ")}'..`);

  return new Dockerode().run(projectName, cmd, [stdout, stderr], {
    Tty: false,
    HostConfig: {
      Binds: [
        `${path.join(constantUtils.PATH_PROJECTS_DIR, projectName, srcFolder)}:/app/src`
      ]
    }
  }).then(async ([ { StatusCode }, container ]) => {
    const containerName = await container.inspect().then(({ Name }) => Name.substr(1)); // Get the container name without the leading slash

    // Remove the container
    await container.remove();

    if (StatusCode === 0) {
      logger.info(`${projectName}'s Docker container (${containerName}) exited with code: ${StatusCode}`);
      return stdout.toString();
    } else {
      logger.error(`${projectName}'s Docker container (${containerName}) exited with code: ${StatusCode}`);
      throw new Error(stderr.toString());
    }
  }).catch(err => {
    logger.error(`Could not run the Docker container for ${projectName} with the command '${cmd.join(" ")}'!`);
    throw err;
  });
};

module.exports = { createDockerImage, runDockerContainer };
