import type { Request, Response, NextFunction } from 'express';

import authMiddlewares, { handleAccessErrors } from '@middlewares/authMiddlewares';
import messageRequestServices from '@services/messageRequestServices';

/**
 * Determines the appropriate function to retrieve message requests based on the user's role.
 *
 * This middleware determines the function to retrieve message requests based on the user's role.
 * - If the user is an admin, it sets the 'findFunction' in the response locals to retrieve all message requests.
 * - If the user is not an admin, it sets the 'findFunction' in the response locals to retrieve message requests made by that user.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Promise<void>} A promise that resolves once the 'findFunction' is set in the response locals.
 */
const determineFindFunctionBasedOnUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if the user is an admin (Supply an empty next function to defer the execution of "next()" for now.)
    authMiddlewares.requireAdmin(req, res, () => null, { returnResponseOnError: false });

    // If the user is an admin, call the 'findAllMessageRequests' function without specifying a user, which will retrieve all message requests
    res.locals.findFunction = messageRequestServices.findAllMessageRequests();
  } catch (error) {
    // If the user is not an admin, call the 'findAllMessageRequests' function with that user
    const { user } = res.locals;
    res.locals.findFunction = messageRequestServices.findAllMessageRequests(user);
  }

  next();
};

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

export default { determineFindFunctionBasedOnUserRole, requireMessageRequestOwned };
