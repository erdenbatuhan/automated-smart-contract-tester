import type { Request, Response, NextFunction } from 'express';

import type { IUser } from '@models/User';

import authMiddlewares, { handleAccessErrors } from '@middlewares/authMiddlewares';
import submissionServices from '@services/submissionServices';

/**
 * Determines the appropriate function to retrieve submissions based on the user's role.
 *
 * This middleware determines the function to retrieve submissions based on the user's role.
 * - If the user is an admin, it sets the 'findFunction' in the response locals to retrieve all submissions.
 * - If the user is not an admin, it sets the 'findFunction' in the response locals to retrieve submissions made by that user.
 *
 * @param {IUser} res.locals.user - The user performing the retrieval (see authMiddlewares).
 * @param {string} res.locals.projectName - The name of the project (see projectMiddlewares).
 * @returns {Promise<void>} A promise that resolves once the find function is set in the response locals.
 */
const determineFindFunctionBasedOnUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { projectName } = res.locals;

  try {
    // If the user is an admin, return all submissions (Provide an empty next function to not trigger "next()" just yet)
    authMiddlewares.requireAdmin(req, res, () => null, { returnResponseOnError: false });

    // Set the find function to retrieve all submissions
    res.locals.findFunction = submissionServices.findAllSubmissions(projectName);
  } catch {
    // If the user is not an admin, return submissions owned by the current user
    const { user } = res.locals;

    // Set the find function to retrieve submissions owned by the user
    res.locals.findFunction = submissionServices.findAllSubmissionsByGivenUser(projectName, user);
  }

  next();
};

/**
 * Middleware to require that the user is the owner of the submission or an admin.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Promise<void>}
 * @throws {AppError} If the user is not the owner of the submission or an admin, or if an error occurs during the check.
 */
const requireSubmissionOwned = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // If the user is an admin, pass directly; otherwise, check if the user is the deployer of the submission
  try {
    authMiddlewares.requireAdmin(req, res, next, { returnResponseOnError: false });
  } catch {
    const { user } = res.locals;
    const { submissionId } = req.params;

    try {
      // Check if the submission is owned by the user
      const submissionExists = await submissionServices.isSubmissionUploadedByGivenUser(user as IUser, submissionId);
      if (!submissionExists) throw new Error(`The submission with the ID '${submissionId}' is not owned by '${user.email}'.`);

      // Proceed
      next();
    } catch (err: Error | unknown) {
      handleAccessErrors(res, err, { returnResponseOnError: true });
    }
  }
};

export default { determineFindFunctionBasedOnUserRole, requireSubmissionOwned };
