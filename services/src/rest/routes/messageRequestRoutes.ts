import { Router } from 'express';
import type { Request, Response } from 'express';
import { HttpStatusCode } from 'axios';

import AppError from '@errors/AppError';

import type { IMessageRequest } from '@models/MessageRequest';

import messageRequestMiddlewares from '@middlewares/messageRequestMiddlewares';
import messageRequestServices from '@services/messageRequestServices';

import routerUtils from '@utils/routerUtils';

const router = Router();

/**
 * Retrieves message requests based on the user's role.
 *  - Admins can retrieve all message requests
 *  - Users can only retrieve the message requests made by them
 *
 * @param {IUser} res.locals.user - The authenticated user (see authMiddlewares).
 * @param {IUser} res.locals.findFunction - The function returning all message requests depending on the user access (see message requestMiddleware).
 * @returns {object} 200 - An array containing all message requests.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/', messageRequestMiddlewares.determineFindFunctionBasedOnUserRole, async (req: Request, res: Response) => {
  const { findFunction } = res.locals;

  findFunction.then((messageRequests: IMessageRequest[]) => {
    res.status(HttpStatusCode.Ok).json(messageRequests);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Retrieves a message request by its ID.
 *
 * @param {string} req.params.messageRequestId - The ID of the message request to find.
 * @returns {object} 200 - The found message request.
 * @throws {object} 404 - If the message request is not found.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/:messageRequestId', messageRequestMiddlewares.requireMessageRequestOwned, async (req: Request, res: Response) => {
  const { messageRequestId } = req.params;

  return messageRequestServices.findMessageRequest(messageRequestId).then((messageRequest) => {
    res.status(HttpStatusCode.Ok).json(messageRequest.toLean());
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

export default router;
