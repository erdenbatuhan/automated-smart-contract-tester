import mongoose from 'mongoose';
import type { SessionOption } from 'mongoose';

import HTTPError from '@errors/http-error';

import DockerImage from '@models/docker-image';
import type { IDockerImage } from '@models/docker-image';
import type { IDockerContainerHistory } from '@models/docker-container-history';

import dockerContainerHistoryService from './docker-container-history-service';

import errorUtils from '@utils/error-utils';
import dockerUtils from '@utils/docker-utils';

/**
 * Find all Docker Images.
 *
 * @returns {Promise<IDockerImage[]>} A promise that resolves to an array of all Docker Images.
 */
const findAllDockerImages = async (): Promise<IDockerImage[]> => DockerImage.find()
  .catch((err) => {
    throw errorUtils.logAndGetError(err as Error, 'An error occurred while finding all docker images.');
  });

/**
 * Creates an HTTP 404 error indicating that a Docker image with the specified name was not found.
 *
 * @param {string} imageName - The name of the Docker image that was not found.
 * @returns {HTTPError} An HTTP 404 error object with a message indicating the image was not found.
 */
const getDockerImageNotFoundError = (imageName: string): HTTPError => new HTTPError(404, `DockerImage with name=${imageName} not found.`);

/**
 * Finds a Docker Image.
 *
 * @param {string} imageName - The name of the Docker Image to find.
 * @returns {Promise<IDockerImage>} A promise that resolves to the found Docker Image.
 * @throws {HTTPError} If an HTTP error occurs during the request.
 * @throws {Error} If any other error occurs.
 */
const findDockerImage = async (
  imageName: string
): Promise<IDockerImage> => DockerImage.findOne({ imageName })
  .then((dockerImage) => {
    if (!dockerImage) throw getDockerImageNotFoundError(imageName);
    return dockerImage;
  })
  .catch((err: HTTPError | Error | unknown) => {
    if (err instanceof HTTPError) {
      throw errorUtils.logAndGetError(err as HTTPError);
    }

    throw errorUtils.logAndGetError(err as Error, `An error occurred while finding the docker image with the name=${imageName}.`);
  });

/**
 * Upserts (insert or update) a Docker Image.
 *
 * @param {IDockerImage} dockerImage - The Docker Image to upsert.
 * @param {SessionOption} [sessionOption] - An optional MongoDB session for the upload.
 * @returns {Promise<IDockerImage>} A promise that resolves to the upserted Docker Image.
 */
const upsertDockerImage = async (
  dockerImage: IDockerImage, sessionOption?: SessionOption
): Promise<IDockerImage> => DockerImage.findOneAndUpdate(
  { imageName: dockerImage.imageName },
  {
    $set: {
      imageID: dockerImage.imageID,
      imageSizeMB: dockerImage.imageSizeMB
    },
    $max: { imageBuildTimeSeconds: dockerImage.imageBuildTimeSeconds || 0 }
  },
  { upsert: true, new: true, ...sessionOption }
);

/**
 * Upserts a Docker Image with associated Docker Container History.
 *
 * @param {IDockerImage} dockerImage - The Docker Image to upsert.
 * @param {IDockerContainerHistory} dockerContainerHistory - Associated Docker Container History.
 * @returns {Promise<{ dockerImageSaved: IDockerImage, dockerContainerHistorySaved: IDockerContainerHistory }>} A promise that resolves to an object containing the upserted Docker Image and the saved Docker Container History.
 * @throws {Error} If an error occurs during the upsert of the docker image or saving of the Docker Container History.
 */
const upsertDockerImageWithDockerContainerHistory = async (
  dockerImage: IDockerImage,
  dockerContainerHistory: IDockerContainerHistory
): Promise<{ dockerImageSaved: IDockerImage; dockerContainerHistorySaved: IDockerContainerHistory }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Save (or update it if it already exists) the docker image within the transaction
    const dockerImageSaved = await upsertDockerImage(dockerImage, { session });

    // Save the docker container history for the executed container within the transaction
    dockerContainerHistory.dockerImage = dockerImageSaved;
    const dockerContainerHistorySaved = await dockerContainerHistoryService.saveDockerContainerHistory(
      dockerContainerHistory, { session });

    // Commit the transaction
    await session.commitTransaction();

    return { dockerImageSaved, dockerContainerHistorySaved };
  } catch (err: Error | unknown) {
    // Handle any errors and abort the transaction
    await session.abortTransaction();
    throw errorUtils.logAndGetError(err as Error, 'An error occurred while saving/updating the Docker Image with associated Docker Container History.');
  } finally {
    session.endSession();
  }
};

/**
 * Removes a Docker Image.
 *
 * @param {string} imageName - The name of the Docker Image to remove.
 * @returns {Promise<void>} A promise that resolves when the Docker Image is successfully removed.
 * @throws {HTTPError} If an HTTP error occurs during the removal process.
 * @throws {Error} If any other error occurs.
 */
const removeDockerImage = async (imageName: string): Promise<void> => {
  try {
    // Remove the image from DB
    await DockerImage.deleteOne({ imageName }).then(({ deletedCount }) => {
      if (!deletedCount) throw getDockerImageNotFoundError(imageName);
    });

    // Remove the image from Docker
    await dockerUtils.removeImage(imageName, { shouldPrune: true });
  } catch (err: HTTPError | Error | unknown) {
    if (err instanceof HTTPError) {
      throw errorUtils.logAndGetError(err as HTTPError);
    }

    throw errorUtils.logAndGetError(err as Error, `An error occurred while removing the Docker Image with the name=${imageName}.`);
  }
};

export default { findAllDockerImages, findDockerImage, upsertDockerImageWithDockerContainerHistory, removeDockerImage };
