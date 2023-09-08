import Logger from '@logging/logger';
import HTTPError from '@errors/http-error';

import type { IDockerImage } from '@models/docker-image';
import type { IDockerContainerHistory } from '@models/docker-container-history';

import dockerImageRepository from '@repositories/docker-image-repository';

import errorUtils from '@utils/error-utils';
import dockerUtils from '@utils/docker-utils';

/**
 * Find all Docker Images.
 *
 * @returns {Promise<IDockerImage[]>} A promise that resolves to an array of all Docker Images.
 */
const findAllDockerImages = async (): Promise<IDockerImage[]> => dockerImageRepository.findAll()
  .catch((err) => {
    throw errorUtils.getErrorWithoutDetails('An error occurred while finding all docker images.', err);
  });

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
): Promise<IDockerImage> => dockerImageRepository.findByName(imageName).catch((err: HTTPError | Error | unknown) => {
  if (err instanceof HTTPError) {
    Logger.error(err.message);
    throw err;
  }

  throw errorUtils.getErrorWithoutDetails(`An error occurred while finding the docker image with the name=${imageName}.`, err);
});

/**
 * Upserts a Docker Image with associated Docker Container History.
 *
 * @param {IDockerImage} dockerImage - The Docker Image to upsert.
 * @param {IDockerContainerHistory} dockerContainerHistory - Associated Docker Container History.
 * @returns {Promise<{ dockerImageSaved: IDockerImage, dockerContainerHistorySaved: IDockerContainerHistory }>} A promise that resolves to an object containing the upserted Docker Image and the saved Docker Container History.
 * @throws {Error | unknown} If an error occurs during the upsert or saving of the Docker Container History.
 */
const upsertDockerImageWithDockerContainerHistory = async (
  dockerImage: IDockerImage,
  dockerContainerHistory: IDockerContainerHistory
): Promise<{
  dockerImageSaved: IDockerImage;
  dockerContainerHistorySaved: IDockerContainerHistory
}> => dockerImageRepository.upsertWithDockerContainerHistory(dockerImage, dockerContainerHistory)
  .catch((err) => {
    throw errorUtils.getErrorWithoutDetails('An error occurred while saving/updating the Docker Image with associated Docker Container History.', err);
  });

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
    await dockerImageRepository.removeDockerImage(imageName);

    // Remove the image from Docker
    await dockerUtils.removeImage(imageName, { shouldPrune: true });
  } catch (err: HTTPError | Error | unknown) {
    if (err instanceof HTTPError) {
      Logger.error(err.message);
      throw err;
    }

    throw errorUtils.getErrorWithoutDetails(`An error occurred while removing the Docker Image with the name=${imageName}.`, err);
  }
};

export default { findAllDockerImages, findDockerImage, upsertDockerImageWithDockerContainerHistory, removeDockerImage };
