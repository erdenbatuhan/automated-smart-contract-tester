import type { Request, Response, NextFunction } from 'express';

import routerUtils, { IModifiedRequest } from '@utils/router-utils';

/**
 * Middleware to extract and pass the 'projectName' parameter from the request to locals.
 *
 * @param {Request} req - The Express.js request object.
 * @param {Response} res - The Express.js response object.
 * @param {NextFunction} next - The Express.js next function to call in the middleware chain.
 */
const passProjectName = (req: Request, res: Response, next: NextFunction) => {
  // Extract and store the 'projectName' parameter in the locals object of the request.
  (req as IModifiedRequest).locals = routerUtils.extractRequiredParams(req, ['projectName']);
  next();
};

export default { passProjectName };
