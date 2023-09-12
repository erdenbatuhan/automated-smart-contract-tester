import type { NextFunction, Request, Response } from 'express';
import { HttpStatusCode } from 'axios';
import jwt from 'jsonwebtoken';
import type { JwtPayload, VerifyErrors } from 'jsonwebtoken';

import AppError from '@errors/app-error';

import { IUser } from '@models/user';

// Read JWT secret from environment variables
const { JWT_SECRET } = process.env;
if (!JWT_SECRET) throw new Error('Missing environment variables (\'JWT_SECRET\')!');

/**
 * Middleware for JWT token authentication.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  // Get token and check if it exists
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
  if (!token) {
    res.status(HttpStatusCode.Unauthorized).json({
      error: new AppError(HttpStatusCode.Unauthorized, 'Authorization is not possible without a valid token!', 'The token is empty.')
    });
    return;
  }

  // Verify the token
  try {
    res.locals.user = jwt.verify(token, JWT_SECRET!) as JwtPayload as IUser; // Extract user from the token
    next();
  } catch (err: VerifyErrors | Error | unknown) {
    res.status(HttpStatusCode.Forbidden).json({
      error: new AppError(HttpStatusCode.Forbidden, 'No access granted for this resource!', (err as Error)?.message)
    });
  }
}

export default { authenticateToken };
