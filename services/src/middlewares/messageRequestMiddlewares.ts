import type { Request, Response, NextFunction } from 'express';

import authMiddlewares, { handleAccessErrors } from '@middlewares/authMiddlewares';
import messageRequestServices from '@services/messageRequestServices';

/**
 * Middleware to require that the user is the owner of the message request or an admin.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Promise<void>}
 * @throws {AppError} If the user is not the deployer of the message request or an admin, or if an error occurs during the check.
 */
const requireMessageRequestOwned = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // If the user is an admin, pass directly; otherwise, check if the user is the owner of the message request
  try {
    authMiddlewares.requireAdmin(req, res, next, { returnResponseOnError: false });
  } catch {
    const { user } = res.locals;
    const { messageRequestId } = req.params;

    try {
      // Check if the message request is owned by the user
      const messageRequestExists = await messageRequestServices.doesMessageRequestBelongToGivenUser(user, messageRequestId);
      if (!messageRequestExists) throw new Error(`The message request with the ID '${messageRequestId}' is not owned by '${user.email}'.`);

      // Proceed
      next();
    } catch (err: Error | unknown) {
      handleAccessErrors(res, err, { returnResponseOnError: true });
    }
  }
};

export default { requireMessageRequestOwned };
