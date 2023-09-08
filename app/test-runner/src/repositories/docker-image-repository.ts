import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';

import HTTPError from '@errors/http-error';

import DockerImage from '@models/docker-image';
import type { IDockerImage } from '@models/docker-image';
import type { IDockerContainerHistory } from '@models/docker-container-history';

import dockerContainerHistoryRepository from '@repositories/docker-container-history-repository';

/**
 * Find all Docker Images.
 *
 * @returns {Promise<IDockerImage[]>} A promise that resolves to an array of all Docker Images.
 */
const findAll = async (): Promise<IDockerImage[]> => DockerImage.find();

/**
 * Finds a Docker Image.
 *
 * @param {string} imageName - The name of the Docker Image to find.
 * @returns {Promise<IDockerImage>} A promise that resolves to the found Docker Image.
 * @throws {HTTPError} If the Docker Image with the given name is not found (HTTP 404).
 */
const findByName = async (imageName: string): Promise<IDockerImage> => {
  const dockerImage = await DockerImage.findOne({ imageName });

  if (!dockerImage) throw new HTTPError(404, `DockerImage with name=${imageName} not found.`);
  return dockerImage;
};

/**
 * Upserts (insert or update) a Docker Image.
 *
 * @param {IDockerImage} dockerImage - The Docker Image to upsert.
 * @param {ClientSession | null} [session=null] - The Mongoose client session.
 * @returns {Promise<IDockerImage>} A promise that resolves to the upserted Docker Image.
 */
const upsert = async (
  dockerImage: IDockerImage, session: ClientSession | null = null
): Promise<IDockerImage> => DockerImage.findOneAndUpdate(
  { imageName: dockerImage.imageName },
  {
    $set: {
      imageID: dockerImage.imageID,
      imageSizeMB: dockerImage.imageSizeMB
    },
    $max: { imageBuildTimeSeconds: dockerImage.imageBuildTimeSeconds || 0 }
  },
  { upsert: true, new: true, session }
);

/**
 * Upserts a Docker Image with associated Docker Container History.
 *
 * @param {IDockerImage} dockerImage - The Docker Image to upsert.
 * @param {IDockerContainerHistory} dockerContainerHistory - Associated Docker Container History.
 * @returns {Promise<{ dockerImageSaved: IDockerImage, dockerContainerHistorySaved: IDockerContainerHistory }>} A promise that resolves to an object containing the upserted Docker Image and the saved Docker Container History.
 * @throws {Error | unknown} If an error occurs during the upsert or saving of the Docker Container History.
 */
const upsertWithDockerContainerHistory = async (
  dockerImage: IDockerImage,
  dockerContainerHistory: IDockerContainerHistory
): Promise<{ dockerImageSaved: IDockerImage; dockerContainerHistorySaved: IDockerContainerHistory }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Save (or update it if it already exists) the docker image within the transaction
    const dockerImageSaved = await upsert(dockerImage, session);

    // Save the docker container history for the executed container within the transaction
    dockerContainerHistory.dockerImage = dockerImageSaved;
    const dockerContainerHistorySaved = await dockerContainerHistoryRepository.save(dockerContainerHistory, session);

    // Commit the transaction
    await session.commitTransaction();

    return { dockerImageSaved, dockerContainerHistorySaved };
  } catch (err: Error | unknown) {
    // Handle any errors and abort the transaction
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Removes a Docker Image.
 *
 * @param {string} imageName - The name of the Docker Image to remove.
 * @returns {Promise<void>} A promise that resolves when the Docker Image is successfully removed.
 * @throws {HTTPError} If the Docker Image with the given name is not found (HTTP 404).
 */
const removeDockerImage = async (imageName: string): Promise<void> => DockerImage.deleteOne({ imageName })
  .then(({ deletedCount }) => {
    if (!deletedCount) throw new HTTPError(404, `DockerImage with name=${imageName} not found.`);
  });

export default { findAll, findByName, upsertWithDockerContainerHistory, removeDockerImage };
