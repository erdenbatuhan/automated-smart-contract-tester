const fs = require("fs");
const path = require("path");
const Dockerode = require("dockerode"); // https://github.com/apocas/dockerode

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
  logger.info(`Creating the docker image for ${projectName}..`);
  const dockerode = new Dockerode();

  return new Promise(async (resolve, reject) => {
    // Create the docker image
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
    logger.info(`Created the docker image (${imageId}) for ${projectName}!`);
    return imageId;
  }).catch(err => {
    logger.error(`Could not create the docker image for ${projectName}!`);
    throw err;
  }).finally(async () => {
    logger.info(`Pruning unused containers and images..`);

    // Prune unused containers and images
    await dockerode.pruneContainers();
    await dockerode.pruneImages();

    logger.info(`Pruned unused containers and images!`);
  });
};

module.exports = { createDockerImage };
