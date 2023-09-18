import jwt from 'jsonwebtoken';

import Constants from '~Constants';
import Logger from '@logging/Logger';

import User from '@models/User';
import type { IUser } from '@models/User';

import errorUtils from '@utils/errorUtils';

// Read JWT secret from environment variables
const { JWT_SECRET } = process.env;
if (!JWT_SECRET) throw new Error('Missing environment variables (\'JWT_SECRET\')!');

/**
 * Generates an authentication response object with a user payload and JWT token.
 *
 * @param {IUser} user - The user object.
 * @returns {{ payload: { user: IUser }, token: string }} The authentication response object.
 */
const getAuthResponse = (user: IUser): { payload: { user: IUser }, token: string } => {
  const payload = { user: user.getPublicRepresentation() };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: Constants.MAX_AGE_JWT });

  return { payload, token };
};

/**
 * Registers a new user with the provided email, password, and optional user role.
 *
 * @param {object} fields
 * @param {string} fields.email - The email of the new user.
 * @param {string} fields.password - The password for the new user.
 * @returns {Promise<{ payload: { user: IUser }, token: string }>} A promise that resolves to the authentication response object.
 */
const register = async (
  { email, password }: { email: string; password: string; }
): Promise<{ payload: { user: IUser }, token: string }> => {
  Logger.info(`Registering a new user with the email '${email}'.`);

  // Create a new user and generate a JWT token (The password is hashed with mongoose pre-save hooks)
  return User.register(email, password).then((newUser) => {
    Logger.info(`Successfully registered a new user with the email '${email}'.`);
    return getAuthResponse(newUser);
  }).catch((err: Error | unknown) => {
    throw errorUtils.handleError(err, `An error occurred while registering a new user with the email '${email}'.`);
  });
};

/**
 * Logs in a user with the provided email and password.
 *
 * @param {object} fields
 * @param {string} fields.email - The email of the new user.
 * @param {string} fields.password - The password for the new user.
 * @returns {Promise<{ payload: { user: IUser }, token: string }>} A promise that resolves to the authentication response object.
 */
const login = async (
  { email, password }: { email: string; password: string; }
): Promise<{ payload: { user: IUser }, token: string }> => {
  Logger.info(`Logging a new user in with the email '${email}'.`);

  // Log the user in and generate a JWT token
  return User.login(email, password).then((user) => {
    Logger.info(`Successfully logged in as ${email}.`);
    return getAuthResponse(user);
  }).catch((err: Error | unknown) => {
    throw errorUtils.handleError(err, `An error occurred while logging a new user in with the email '${email}'.`);
  });
};

export default { register, login };
