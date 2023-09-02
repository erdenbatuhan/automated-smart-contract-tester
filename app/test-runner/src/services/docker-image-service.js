const mongoose = require('mongoose');

const DockerImage = require('../models/docker-image');
const HTTPError = require('../errors/http-error');

const dockerContainerHistoryService = require('./docker-container-history-service');

const findDockerImageByName = async (imageName, arg = null) => {
  const dockerImage = !arg
    ? await DockerImage.findOne({ imageName })
    : await DockerImage.findOne({ imageName }).select(arg.join(' '));

  if (!dockerImage) throw new HTTPError(404, `Docker image with name=${imageName} not found!`);
  return dockerImage;
};

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

module.exports = { findDockerImageByName, upsertWithDockerContainerHistory };
