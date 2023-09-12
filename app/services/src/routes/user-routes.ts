import { Router } from 'express';
import type { Request, Response } from 'express';

import AppError from '@errors/app-error';

import userService from '@services/user-service';

import routerUtils from '@utils/router-utils';

const router = Router();

/**
 * Retrieves all users.
 *
 * @returns {object} 200 - An array containing all users.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/', async (req: Request, res: Response) => {
  userService.findAllUsers().then((users) => {
    res.status(200).json(users);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
  });
});

/**
 * Retrieves a user by its ID.
 *
 * @param {IUser} res.locals.user - The user performing the retrieval (see auth-middleware).
 * @param {string} req.params.userId - The ID of the user.
 * @returns {object} 200 - The user information.
 * @throws {object} 404 - If the user does not exist.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  userService.findUserById(userId).then((user) => {
    res.status(200).json(user);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
  });
});

/**
 * Deletes a user.
 *
 * @param {IUser} res.locals.user - The user performing the removal (see auth-middleware).
 * @param {string} req.params.userId - The ID of the user that is to be deleted.
 * @returns {object} 204 - If the user deletion is successful.
 * @throws {object} 404 - If the user doesn't exist.
 * @throws {object} 500 - If there's a server error.
 */
router.delete('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  userService.deleteUserById(userId).then(() => {
    res.status(204).end();
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
  });
});

export default router;
