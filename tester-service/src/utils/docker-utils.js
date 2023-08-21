const fs = require("fs");
const path = require("path");
const Dockerode = require("dockerode"); // https://github.com/apocas/dockerode

const logger = require("./logger-utils");
const constantUtils = require("./constant-utils");

const _getDockerContext = (projectName) => {
  const dockerfilePath = path.join(constantUtils.PATH_PROJECTS_DIR, projectName, "Dockerfile");

  // Check if the Dockerfile exists before attempting to build the image
  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(`Dockerfile not found at ${dockerfilePath}`);
  }

  return path.dirname(dockerfilePath);
};

const _extractImageIdFromStreamResult = (streamRes) => streamRes.map(({ stream }) => stream).join("").match(constantUtils.DOCKER_STREAM_REGEX_IMAGE_ID)[1];

const createDockerImage = (projectName) => {
  logger.info(`Creating the docker image for ${projectName}..`);

  return new Promise(async (resolve, reject) => {
    try {
      const dockerode = new Dockerode();
      const stream = await dockerode.buildImage({
        context: _getDockerContext(projectName),
        src: constantUtils.DOCKER_IMAGE_SRC
      }, {
        t: projectName
      });

      dockerode.modem.followProgress(stream,
        /**
         * The callback function triggered when the progress is complete
         */
        async (streamErr, streamRes) => {
          // On Error
          const execErr = streamRes ? streamRes.find(({ error }) => !!error) : null;
          if (streamErr || execErr) {
            await dockerode.pruneContainers();
            await dockerode.pruneImages();

            logger.error(`Could not create the docker image for ${projectName}!`);
            return reject(new Error(streamErr || execErr.error));
          }

          // On Success
          try {
            logger.info(`Successfully created the docker image for ${projectName}!`);
            resolve(_extractImageIdFromStreamResult(streamRes));
          } catch {
            logger.error(`Image ID not found after creating the docker image for ${projectName}!`);
            reject(new Error("Image ID not found!"));
          }
        },
        /**
         * The callback function triggered at each step
         */
        ({ stream }) => {
          if (constantUtils.DOCKER_STREAM_REGEX_STEP.test(stream)) {
            logger.info(stream);
          }
        }
      );
    } catch (err) {
      logger.error(`Could not create the docker image for ${projectName}!`);
      reject(err);
    }
  })
};

module.exports = { createDockerImage };
