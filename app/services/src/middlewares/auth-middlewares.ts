import type { Request, Response, NextFunction } from 'express';
import { HttpStatusCode } from 'axios';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import type { IUser } from '@models/user';
import UserType from '@models/enums/user-type';

import routerUtils from '@utils/router-utils';

// Read JWT secret from environment variables
const { JWT_SECRET } = process.env;
if (!JWT_SECRET) throw new Error('Missing environment variables (\'JWT_SECRET\')!');

/**
 * Checks access and proceeds if access is granted.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @param {(req: Request, res: Response) => void} accessCheckerFn - A function that checks access.
 * @throws {AppError} Throws an error if the access is not granted.
 * @returns {void}
 */
const checkAccessAndProceed = (res: Response, next: NextFunction, accessCheckerFn: () => void): void => {
  try {
    accessCheckerFn(); // Check access
    next(); // Proceed
  } catch (err: AppError | Error | unknown) { // Handle access errors
    const appError = (err instanceof AppError)
      ? err
      : new AppError(HttpStatusCode.Forbidden, 'No access granted for this resource.', (err as Error)?.message);

    Logger.error(`${appError.message} (Reason: ${appError.reason})`);
    routerUtils.handleError(res, appError);
  }
};

/**
 * (Middleware) Requires authentication via JWT token.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {void}
 */
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  checkAccessAndProceed(res, next, (): void => {
    // Get token and check if it exists
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
    if (!token) throw new AppError(HttpStatusCode.Unauthorized, 'Cannot authenticate without a valid token.', 'Empty token!');

    // Extract user from the token (Throws an Error if the token is not verified)
    const payload = jwt.verify(token, JWT_SECRET!) as JwtPayload;
    res.locals.user = payload.user; // Set user object
  });
};

/**
 * Checks if a user has a specific type that matches one of the allowed types.
 *
 * @param {Response} res - Express response object.
 * @param {UserType[]} allowedTypes - The allowed user types.
 * @throws {Error} Throws an error if the user type does not match the allowed type.
 * @returns {void}
 */
const checkUserType = (res: Response, allowedTypes: UserType[]): void => {
  if (!allowedTypes.some((allowedType) => (res.locals?.user as IUser)?.type === allowedType)) {
    throw new Error(`The user is not ${allowedTypes.join(' or ')}.`);
  }
};

/**
 * (Middleware) Requires at least a user type access.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {void}
 */
const requireUser = (req: Request, res: Response, next: NextFunction): void => {
  checkAccessAndProceed(res, next, (): void => {
    checkUserType(res, [UserType.USER, UserType.ADMIN]); // Make sure 'requireAuth' has been called before!
  });
};

/**
 * (Middleware) Requires an admin type access.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {void}
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  checkAccessAndProceed(res, next, (): void => {
    checkUserType(res, [UserType.ADMIN]); // Make sure 'requireAuth' has been called before!
  });
};

export default { requireAuth, requireUser, requireAdmin };
