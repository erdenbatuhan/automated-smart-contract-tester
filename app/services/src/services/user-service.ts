import type { SessionOption } from 'mongoose';
import { HttpStatusCode } from 'axios';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import User from '@models/user';
import type { IUser } from '@models/user';

import errorUtils from '@utils/error-utils';

/**
 * Finds all users (without passwords).
 *
 * @param {SessionOption} [sessionOption] - Optional session options.
 * @returns {Promise<IUser[]>} A promise that resolves to an array of all users (without passwords).
 * @throws {AppError} If an error occurs during the operation.
 */
const findAllUsers = async (
  sessionOption?: SessionOption
): Promise<IUser[]> => User.find({}, null, sessionOption)
  .exec()
  .catch((err: Error | unknown) => {
    throw errorUtils.logAndGetError(new AppError(
      HttpStatusCode.InternalServerError, 'An error occurred while finding all users.', (err as Error)?.message
    ));
  });

/**
 * Finds a user by its ID (without password).
 *
 * @param {string} userId - The ID of the user to find.
 * @param {SessionOption} [sessionOption] - Optional session options.
 * @returns {Promise<IUser>} A promise that resolves to the found user (without password).
 */
const findUserById = (
  userId: string, sessionOption?: SessionOption
): Promise<IUser> => User.findById(userId, null, sessionOption)
  .exec()
  .then((user) => {
    if (!user) throw new AppError(HttpStatusCode.NotFound, `No user with the ID '${userId}' found.`);
    return user;
  })
  .catch((err) => {
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || HttpStatusCode.InternalServerError,
      `An error occurred while finding the user with the ID '${userId}'.`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
  });

/**
 * Deletes a user by its ID.
 *
 * @param {string} userId - The ID of the user that is to be deleted.
 * @param {SessionOption} [sessionOption] - Optional session to use for the deletion operation.
 * @returns {Promise<void>} A promise that resolves once the user is successfully deleted.
 * @throws {AppError} If the user document does not exist (HTTP 404) or if there's an error during the deletion process (HTTP 500).
 */
const deleteUserById = async (userId: string, sessionOption?: SessionOption): Promise<void> => {
  Logger.info(`Deleting the user with the ID '${userId}'.`);

  await User.findByIdAndDelete(userId, sessionOption).exec().then((userDeleted) => {
    if (!userDeleted) {
      throw new AppError(HttpStatusCode.NotFound, `No user with the ID '${userId}' found.`);
    }

    Logger.info(`Successfully deleted the user with the ID '${userId}'.`);
  }).catch((err: AppError | Error | unknown) => {
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || HttpStatusCode.InternalServerError,
      `An error occurred while deleting the user with the ID '${userId}'.`,
      (err as AppError)?.reason || (err as Error)?.message
    ));
  });
};

export default { findAllUsers, findUserById, deleteUserById };
