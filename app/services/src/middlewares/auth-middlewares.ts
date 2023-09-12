import type { Request, Response, NextFunction } from 'express';
import { HttpStatusCode } from 'axios';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import type { IUser } from '@models/user';
import UserRole from '@models/enums/user-role';

import routerUtils from '@utils/router-utils';

// Read JWT secret from environment variables
const { JWT_SECRET } = process.env;
if (!JWT_SECRET) throw new Error('Missing environment variables (\'JWT_SECRET\')!');

/**
 * Handles access-related errors and either sends an appropriate response or throws an error.
 *
 * @param {Response} res - Express response object.
 * @param {AppError | Error | unknown} err - The error to handle.
 * @param {Object} [options] - Options for controlling the error handling behavior.
 * @param {boolean} [options.returnResponseOnError=true] - If true, sends a response; if false, throws the error.
 * @returns {void}
 * @throws {AppError} If `options.returnResponseOnError` is false and the error is thrown.
 */
export const handleAccessErrors = (
  res: Response, err: AppError | Error | unknown,
  options: { returnResponseOnError: boolean } = { returnResponseOnError: true }
): void => {
  const appError = (err instanceof AppError)
    ? err
    : new AppError(HttpStatusCode.Forbidden, 'No access granted for this resource.', (err as Error)?.message);

  if (options.returnResponseOnError) {
    Logger.error(`${appError.message} (Reason: ${appError.reason})`);
    routerUtils.handleError(res, appError);
  } else {
    throw appError;
  }
};

/**
 * Middleware to require JWT token authentication for accessing protected routes.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next function.
 * @returns {void}
 * @throws {AppError} If authentication fails due to an invalid or missing token.
 */
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token and check if it exists
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
    if (!token) throw new AppError(HttpStatusCode.Unauthorized, 'Cannot authenticate without a valid token.', 'Empty token!');

    // Extract user from the token (Throws an Error if the token is not verified)
    const payload = jwt.verify(token, JWT_SECRET!) as JwtPayload;
    res.locals.user = payload.user; // Set user object

    // Proceed
    next();
  } catch (err: AppError | Error | unknown) {
    handleAccessErrors(res, err);
  }
};

/**
 * Checks if a user has a specific type that matches one of the allowed roles.
 *
 * @param {Response} res - Express response object.
 * @param {UserRole[]} allowedRoles - The allowed user roles.
 * @returns {void}
 * @throws {Error} Throws an error if the user role does not match the allowed role.
 */
const checkUserRole = (res: Response, allowedRoles: UserRole[]): void => {
  const { user } = res.locals;

  if (!allowedRoles.some((allowedRole) => (user as IUser)?.role === allowedRole)) {
    throw new Error(`The user is not ${allowedRoles.join(' or ')}.`);
  }
};

/**
 * (Middleware) Requires at least a user role access.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @param {Object} [options] - Options for controlling the error handling behavior.
 * @param {boolean} [options.returnResponseOnError=true] - If true, sends a response; if false, throws the error.
 * @returns {void}
 * @throws {AppError} If the user is not authenticated as an ADMIN or if an error occurs during the check.
 */
const requireUser = (
  req: Request, res: Response, next: NextFunction,
  options: { returnResponseOnError: boolean } = { returnResponseOnError: true }
): void => {
  try {
    // Check if the user is authenticated as at least a USER, then proceed
    checkUserRole(res, [UserRole.USER, UserRole.ADMIN]); // Make sure 'requireAuth' has been called before!
    next();
  } catch (err: AppError | Error | unknown) {
    handleAccessErrors(res, err, options);
  }
};

/**
 * Middleware to require admin role access.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @param {Object} [options] - Options for controlling the error handling behavior.
 * @param {boolean} [options.returnResponseOnError=true] - If true, sends a response; if false, throws the error.
 * @returns {void}
 * @throws {AppError} If the user is not authenticated as an ADMIN or if an error occurs during the check.
 */
const requireAdmin = (
  req: Request, res: Response, next: NextFunction,
  options: { returnResponseOnError: boolean } = { returnResponseOnError: true }
): void => {
  try {
    // Check if the user is authenticated as an ADMIN, then proceed
    checkUserRole(res, [UserRole.ADMIN]); // Make sure 'requireAuth' has been called before!
    next();
  } catch (err: AppError | Error | unknown) {
    handleAccessErrors(res, err, options);
  }
};

export default { requireAuth, requireUser, requireAdmin };
