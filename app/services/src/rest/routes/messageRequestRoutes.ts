import { Router } from 'express';
import type { Request, Response } from 'express';
import { HttpStatusCode } from 'axios';

import AppError from '@errors/AppError';

import messageRequestMiddlewares from '@middlewares/messageRequestMiddlewares';
import messageRequestServices from '@services/messageRequestServices';

import routerUtils from '@utils/routerUtils';

const router = Router();

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
