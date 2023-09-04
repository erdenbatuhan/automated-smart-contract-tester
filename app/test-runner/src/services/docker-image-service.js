const mongoose = require('mongoose');

const DockerImage = require('../models/docker-image');
const HTTPError = require('../errors/http-error');

const dockerContainerHistoryService = require('./docker-container-history-service');

/**
 * Find a Docker image by its name.
 *
 * @param {} imageName - The name of the Docker image to find.
 * @param {String[]} [arg] - Optional array of field names to select from the DockerImage document.
 * @returns {Promise<DockerImage>} A promise that resolves to the found DockerImage document.
 * @throws {HTTPError} If the Docker image with the given name is not found (HTTP 404).
 */
const findByName = async (imageName, arg = null) => {
  const dockerImage = !arg
    ? await DockerImage.findOne({ imageName })
    : await DockerImage.findOne({ imageName }).select(arg.join(' '));

  if (!dockerImage) throw new HTTPError(404, `Docker image with name=${imageName} not found!`);
  return dockerImage;
};

/**
 * Upsert (insert or update) a Docker image document.
 *
 * @param {DockerImage} dockerImage - The DockerImage document to upsert.
 * @param {mongoose.ClientSession} session - The Mongoose client session.
 * @returns {Promise<DockerImage>} A promise that resolves to the upserted DockerImage document.
 */
const upsert = (dockerImage, session) => DockerImage.findOneAndUpdate(
  { imageName: dockerImage.imageName },
  {
    $set: {
      imageID: dockerImage.imageID,
      imageSizeMB: dockerImage.imageSizeMB
    },
    $max: { imageBuildTimeSeconds: dockerImage.imageBuildTimeSeconds }
  },
  { upsert: true, new: true, session }
);

/**
 * Upsert a Docker image document with associated Docker container history.
 *
 * @param {DockerImage} dockerImage - The DockerImage document to upsert.
 * @param {Object} dockerContainerExecutionInfo - Information about the executed Docker container.
 * @returns {Promise<{ dockerImageSaved: DockerImage, dockerContainerHistorySaved: import('../models/docker-container-history') }>} A promise that resolves to an object containing the upserted DockerImage document and the saved Docker container history.
 * @throws {Error} If an error occurs during the upsert or saving of the Docker container history.
 */
const upsertWithDockerContainerHistory = async (dockerImage, dockerContainerExecutionInfo) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Save (or update it if it already exists) the docker image within the transaction
    const dockerImageSaved = await upsert(dockerImage, session);

    // Save the docker container history for the executed container within the transaction
    const dockerContainerHistorySaved = await dockerContainerHistoryService.save(
      dockerContainerHistoryService.create(dockerImageSaved, dockerContainerExecutionInfo), session);

    // Commit the transaction
    await session.commitTransaction();

    return { dockerImageSaved, dockerContainerHistorySaved };
  } catch (error) {
    // Handle any errors and abort the transaction
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = { findByName, upsertWithDockerContainerHistory };
