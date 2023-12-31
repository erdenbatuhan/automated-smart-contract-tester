import { Router } from 'express';
import type { Request, Response } from 'express';
import { HttpStatusCode } from 'axios';

import Constants from '@Constants';
import type AppError from '@errors/AppError';

import authMiddlewares from '@middlewares/authMiddlewares';
import authServices from '@services/authServices';

import routerUtils from '@utils/routerUtils';

const router = Router();

/**
 * Sends a JSON response containing a JWT token as a cookie and a payload with the specified HTTP status code.
 *
 * @param {Response} res - Express response object.
 * @param {number} code - HTTP status code to send in the response.
 * @param {object} payload - JSON payload to include in the response body.
 * @param {string} token - JWT token to set as an HTTP-only cookie.
 * @returns {object} An object with the user data in the response.
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
  authServices.register(req.body).then(({ payload, token }) => {
    returnJwtResponse(res, HttpStatusCode.Created, payload, token);
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
  authServices.login(req.body).then(({ payload, token }) => {
    returnJwtResponse(res, HttpStatusCode.Ok, payload, token);
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
  res.status(HttpStatusCode.NoContent).end();
});

export default router;
