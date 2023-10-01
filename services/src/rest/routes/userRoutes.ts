import { Router } from 'express';
import type { Request, Response } from 'express';
import { HttpStatusCode } from 'axios';

import type AppError from '@errors/AppError';

import authMiddlewares from '@middlewares/authMiddlewares';
import userServices from '@services/userServices';

import routerUtils from '@utils/routerUtils';

const router = Router();

/**
 * Retrieves all users or specific users by their IDs.
 *
 * @param {IUser} res.locals.user - The user performing the retrieval (see authMiddlewares).
 * @param {string | undefined} [req.query.ids] - Optional list of user IDs "separated by commas" to filter the users.
 * @returns {object} 200 - An array containing all users.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/', authMiddlewares.requireUser, async (req: Request, res: Response) => {
  try {
    const userIds = req.query?.ids ? String(req.query.ids).split(',') : null;

    await userServices.findUsersByIds(userIds).then((users) => {
      const leanUsers = users.map((user) => user.toLean());
      res.status(HttpStatusCode.Ok).json(leanUsers);
    });
  } catch (err: AppError | Error | unknown) {
    routerUtils.sendErrorResponse(res, err);
  }
});

/**
 * Retrieves a user by their ID.
 *
 * @param {IUser} res.locals.user - The user performing the retrieval (see authMiddlewares).
 * @param {string} req.params.userId - The ID of the user.
 * @returns {object} 200 - The user information.
 * @throws {object} 404 - If the user does not exist.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/:userId', authMiddlewares.requireUser, async (req: Request, res: Response) => {
  const { userId } = req.params;

  userServices.findUserById(userId).then((user) => {
    const leanUser = user.toLean();
    res.status(HttpStatusCode.Ok).json(leanUser);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Deletes a user by their ID.
 *
 * @param {IUser} res.locals.user - The user performing the removal (see authMiddlewares).
 * @param {string} req.params.userId - The ID of the user that is to be deleted.
 * @returns {object} 204 - If the user deletion is successful.
 * @throws {object} 404 - If the user doesn't exist.
 * @throws {object} 500 - If there's a server error.
 */
router.delete('/:userId', authMiddlewares.requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;

  userServices.deleteUserById(userId).then(() => {
    res.status(HttpStatusCode.NoContent).end();
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

export default router;
