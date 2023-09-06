import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';

import HTTPError from '@errors/http-error';

import DockerImage from '@models/docker-image';
import type { IDockerImage } from '@models/docker-image';
import type { IDockerContainerHistory } from '@models/docker-container-history';

import dockerContainerHistoryService from '@services/docker-container-history-service';

/**
 * Find a Docker image by its name.
 *
 * @param {string} imageName - The name of the Docker image to find.
 * @param {string[]} [arg] - Optional array of field names to select from the DockerImage document.
 * @returns {Promise<IDockerImage>} A promise that resolves to the found DockerImage document.
 * @throws {HTTPError} If the Docker image with the given name is not found (HTTP 404).
 */
const findByName = async (imageName: string, arg: string[] | null = null): Promise<IDockerImage> => {
  const query = !arg ? DockerImage.findOne({ imageName }) : DockerImage.findOne({ imageName }).select(arg.join(' '));
  const dockerImage = await query.exec();

  if (!dockerImage) throw new HTTPError(404, `Docker image with name=${imageName} not found.`);
  return dockerImage;
};

/**
 * Upsert (insert or update) a Docker image document.
 *
 * @param {IDockerImage} dockerImage - The DockerImage document to upsert.
 * @param {ClientSession | null} [session=null] - The Mongoose client session.
 * @returns {Promise<IDockerImage>} A promise that resolves to the upserted DockerImage document.
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
 * Upsert a Docker image document with associated Docker container history.
 *
 * @param {IDockerImage} dockerImage - The DockerImage document to upsert.
 * @param {IDockerContainerHistory} dockerContainerHistory - Associated Docker container history.
 * @returns {Promise<{ dockerImageSaved: IDockerImage, dockerContainerHistorySaved: IDockerContainerHistory }>} A promise that resolves to an object containing the upserted DockerImage document and the saved Docker container history.
 * @throws {Error | unknown} If an error occurs during the upsert or saving of the Docker container history.
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
    const dockerContainerHistorySaved = await dockerContainerHistoryService.save(dockerContainerHistory, session);

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

export default { findByName, upsertWithDockerContainerHistory };
