import type { SessionOption } from 'mongoose';
import { HttpStatusCode } from 'axios';

import Logger from '@Logger';
import AppError from '@errors/AppError';

import User from '@models/User';
import type { IUser } from '@models/User';

/**
 * Finds all users (without passwords).
 *
 * @returns {Promise<IUser[]>} A promise that resolves to an array of all users (without passwords).
 * @throws {AppError} If an error occurs during the operation.
 */
const findAllUsers = async (): Promise<IUser[]> => User.find().exec()
  .catch((err: Error | unknown) => {
    throw AppError.createAppError(err, 'An error occurred while finding all users.');
  });

/**
 * Finds a user by its ID (without password).
 *
 * @param {string} userId - The ID of the user to find.
 * @param {SessionOption} [sessionOption] - Optional session options.
 * @returns {Promise<IUser>} A promise that resolves to the found user (without password).
 * @throws {AppError} If the user does not exist (HTTP 404) or if there's an error during the find operation (HTTP 500).
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
    throw AppError.createAppError(err, `An error occurred while finding the user with the ID '${userId}'.`);
  });

/**
 * Deletes a user by its ID.
 *
 * @param {string} userId - The ID of the user that is to be deleted.
 * @param {SessionOption} [sessionOption] - Optional session to use for the deletion operation.
 * @returns {Promise<void>} A promise that resolves once the user is successfully deleted.
 * @throws {AppError} If the user does not exist (HTTP 404) or if there's an error during the deletion process (HTTP 500).
 */
const deleteUserById = async (userId: string, sessionOption?: SessionOption): Promise<void> => {
  Logger.info(`Deleting the user with the ID '${userId}'.`);

  await User.findByIdAndDelete(userId, sessionOption).exec().then((userDeleted) => {
    if (!userDeleted) {
      throw new AppError(HttpStatusCode.NotFound, `No user with the ID '${userId}' found.`);
    }

    Logger.info(`Successfully deleted the user with the ID '${userId}'.`);
  }).catch((err: AppError | Error | unknown) => {
    throw AppError.createAppError(err, `An error occurred while deleting the user with the ID '${userId}'.`);
  });
};

export default { findAllUsers, findUserById, deleteUserById };
