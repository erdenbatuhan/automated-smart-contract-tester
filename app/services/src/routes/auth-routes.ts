import { Router } from 'express';
import type { Request, Response } from 'express';

import Constants from '~constants';
import type AppError from '@errors/app-error';

import authMiddlewares from '@middlewares/auth-middlewares';
import authService from '@services/auth-service';

import routerUtils from '@utils/router-utils';

const router = Router();

/**
 * Sends a JSON response containing a JWT token as a cookie and a payload with the specified HTTP status code.
 *
 * @param {Response} res - Express response object.
 * @param {number} code - HTTP status code to send in the response.
 * @param {object} payload - JSON payload to include in the response body.
 * @param {string} token - JWT token to set as an HTTP-only cookie.
 * @returns {void}
 */
const returnJwtResponse = (res: Response, code: number, payload: object, token: string): void => {
  res.cookie(Constants.JWT_NAME, token, { httpOnly: true, maxAge: Constants.MAX_AGE_COOKIE });
  res.status(code).json(payload);
};

/**
 * Registers a user and returns a JWT response.
 *
 * @param {string} req.body.email - The email of the new user.
 * @param {string} req.body.password - The password for the new user.
 * @returns {object} 201 - The created user.
 * @throws {object} 409 - If the user already exists.
 * @throws {object} 500 - If there's a server error.
 */
router.post('/signup', async (req: Request, res: Response) => {
  authService.register(req.body).then(({ payload, token }) => {
    returnJwtResponse(res, 201, payload, token);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Logs in a user and returns a JWT response.
 *
 * @param {string} req.body.email - The email of the new user.
 * @param {string} req.body.password - The password for the new user.
 * @returns {object} 200 - The authorized user.
 * @throws {object} 401 - If the credentials provided are not correct.
 * @throws {object} 404 - If the user does not exist.
 * @throws {object} 500 - If there's a server error.
 */
router.post('/login', async (req: Request, res: Response) => {
  authService.login(req.body).then(({ payload, token }) => {
    returnJwtResponse(res, 200, payload, token);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Logs outs the user.
 *
 * @returns {object} 204 - Empty response.
 */
router.get('/logout', authMiddlewares.requireAuth, async (req: Request, res: Response) => {
  res.cookie(Constants.JWT_NAME, '', { maxAge: 1 });
  res.status(204).end();
});

export default router;
