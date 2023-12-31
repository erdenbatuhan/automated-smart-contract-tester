import type { MongoError } from 'mongodb';
import mongoose from 'mongoose';
import type { SessionOption } from 'mongoose';
import { HttpStatusCode } from 'axios';

import Logger from '@Logger';
import AppError from '@errors/AppError';

import DockerImage from '@models/DockerImage';
import type { IDockerImage } from '@models/DockerImage';
import type { IDockerContainerHistory } from '@models/DockerContainerHistory';

import dockerContainerHistoryServices from './dockerContainerHistoryServices';

import dockerUtils from '@utils/dockerUtils';

/**
 * Find all Docker Images.
 *
 * @returns {Promise<IDockerImage[]>} A promise that resolves to an array of all Docker Images.
 * @throws {AppError} If something goes wrong.
 */
const findAllDockerImages = async (): Promise<IDockerImage[]> => DockerImage.find().exec()
  .catch((err: Error | unknown) => {
    throw AppError.createAppError(err, 'An error occurred while finding all docker images.');
  });

/**
 * Creates an HTTP 404 error indicating that a Docker image with the specified name was not found.
 *
 * @param {string} imageName - The name of the Docker image that was not found.
 * @returns {AppError} An HTTP 404 error object with a message indicating the image was not found.
 */
const getDockerImageNotFoundError = (imageName: string): AppError => new AppError(HttpStatusCode.NotFound, `DockerImage with name=${imageName} not found.`);

/**
 * Find a Docker Image by its name.
 *
 * @param {string} imageName - The name of the Docker Image to find.
 * @param {SessionOption} [sessionOption] - An optional MongoDB session for the query.
 * @param {boolean} [required=true] - If true, throws an error if the Docker Image is not found.
 * @returns {Promise<IDockerImage | null>} A promise that resolves to the found Docker Image or null if not found (based on the 'required' parameter).
 * @throws {AppError} If an error occurs during the find request.
 */
const findDockerImage = async (
  imageName: string, sessionOption?: SessionOption, required: boolean = true
): Promise<IDockerImage | null> => DockerImage.findOne({ imageName }).session(sessionOption?.session || null).exec()
  .then((dockerImage) => {
    if (!dockerImage && required) throw getDockerImageNotFoundError(imageName);
    return dockerImage;
  })
  .catch((err: AppError | Error | unknown) => {
    throw AppError.createAppError(err, `An error occurred while finding the docker image with the name=${imageName}.`);
  });

/**
 * Saves or updates a Docker Image.
 *
 * @param {IDockerImage} dockerImage - The Docker Image to save.
 * @param {SessionOption} [sessionOption] - An optional MongoDB session for the upload.
 * @returns {Promise<{ isNew: boolean; dockerImageSaved: IDockerImage }>} A promise that resolves to the saved Docker Image.
 */
const saveDockerImage = async (
  dockerImage: IDockerImage, sessionOption?: SessionOption
): Promise<{ isNew: boolean; dockerImageSaved: IDockerImage }> => {
  const existingDockerImage = await findDockerImage(dockerImage.imageName, sessionOption, false);
  const dockerImageToSave = existingDockerImage || new DockerImage(dockerImage);

  // Update the existing docker image with new fields if it exists and its image ID has changed
  if (existingDockerImage && existingDockerImage.imageID !== dockerImage.imageID) {
    Object.assign(existingDockerImage, dockerImage);
  }

  // Save the Docker image
  const dockerImageSaved = await dockerImageToSave.save(sessionOption);
  return { isNew: !existingDockerImage, dockerImageSaved };
};

/**
 * Handles the error that occurred while saving or updating a Docker Image and associated Docker Container History.
 *
 * @param {string} dockerImageID - The imageID for which the error occurred.
 * @param {MongoError | Error | unknown} err - The error object to handle.
 * @returns {Promise<AppError>} Returns an HTTP error if the error is a duplicate imageID error; otherwise, returns a generic error for any other error.
 */
const handleSaveErrorAndReturn = async (
  dockerImageID: string, err: MongoError | Error | unknown
): Promise<AppError | MongoError | Error | unknown> => {
  const httpErr = new AppError(HttpStatusCode.Conflict, (err as Error)?.message);

  // Handle duplicate image ID error if it's the case
  if ((err as MongoError)?.code === 11000 && (err as MongoError)?.message.includes('imageID')) { // Duplicate image ID error
    const existingImage = await DockerImage.findOne({ imageID: dockerImageID }, 'imageName').exec();
    httpErr.reason = `An image with imageID=${dockerImageID} already exists (${existingImage?.imageName}). Please use that one or delete it first!`;
  }

  return AppError.createAppError(httpErr, 'An error occurred while saving/updating the Docker Image with associated Docker Container History.');
};

/**
 * Saves a Docker Image with associated Docker Container History.
 *
 * @param {IDockerImage} dockerImage - The Docker Image to save.
 * @param {IDockerContainerHistory} dockerContainerHistory - Associated Docker Container History.
 * @returns {Promise<{ isNew: boolean; dockerImageSaved: IDockerImage; dockerContainerHistorySaved: IDockerContainerHistory }>} A promise that resolves to an object containing the saved Docker Image and the saved Docker Container History.
 * @throws {AppError} If an error occurs during the save of the docker image or saving of the Docker Container History.
 */
const saveDockerImageWithDockerContainerHistory = async (
  dockerImage: IDockerImage, dockerContainerHistory: IDockerContainerHistory
): Promise<{ isNew: boolean; dockerImageSaved: IDockerImage; dockerContainerHistorySaved: IDockerContainerHistory }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Save (or update it if it already exists) the docker image within the transaction
    const { isNew, dockerImageSaved } = await saveDockerImage(dockerImage, { session });

    // Save the docker container history for the executed container within the transaction
    dockerContainerHistory.dockerImage = dockerImageSaved;
    const dockerContainerHistorySaved = await dockerContainerHistoryServices.saveDockerContainerHistory(
      dockerContainerHistory, { session });

    // Commit the transaction
    await session.commitTransaction();

    return { isNew, dockerImageSaved, dockerContainerHistorySaved };
  } catch (err: MongoError | Error | unknown) {
    // Abort the transaction
    await session.abortTransaction();

    // Handle save errors
    throw await handleSaveErrorAndReturn(dockerImage.imageID, err);
  } finally {
    await session.endSession();
  }
};

/**
 * Removes a Docker Image.
 *
 * @param {string} imageName - The name of the Docker Image to remove.
 * @returns {Promise<void>} A promise that resolves when the Docker Image is successfully removed.
 * @throws {AppError} If an error occurs during the removal process.
 */
const deleteDockerImage = async (imageName: string): Promise<void> => {
  try {
    Logger.info(`Deleting the Docker Image with the name=${imageName}.`);

    // Remove the image from DB
    await DockerImage.deleteOne({ imageName }).exec().then(({ deletedCount }) => {
      if (!deletedCount) throw getDockerImageNotFoundError(imageName);
    });

    // Remove the image from Docker
    await dockerUtils.removeImage(imageName, { shouldPrune: true });

    Logger.info(`Successfully deleted the Docker Image with the name=${imageName}.`);
  } catch (err: AppError | Error | unknown) {
    throw AppError.createAppError(err, `An error occurred while deleting the Docker Image with the name=${imageName}.`);
  }
};

export default {
  findAllDockerImages,
  findDockerImage,
  saveDockerImageWithDockerContainerHistory,
  deleteDockerImage
};
