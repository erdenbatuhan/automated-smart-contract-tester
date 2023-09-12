import type { NextFunction, Request, Response } from 'express';
import { HttpStatusCode } from 'axios';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

import AppError from '@errors/app-error';

import { IUser } from '@models/user';

/**
 * Middleware for JWT token authentication.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  // Get token and check if it exists
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(HttpStatusCode.Unauthorized).json({ error: new AppError(HttpStatusCode.Unauthorized, 'Unauthorized.') });
    return;
  }

  // Verify the token
  try {
    res.locals.user = jwt.verify(token, 'SECRET_KEY') as JwtPayload as IUser; // Extract user from the token
    next();
  } catch {
    res.status(HttpStatusCode.Forbidden).json({ error: new AppError(HttpStatusCode.Forbidden, 'Invalid token!') });
  }
}

export default { authenticateToken };
