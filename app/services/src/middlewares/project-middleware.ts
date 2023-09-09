import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware that extracts the 'projectName' parameter from the request and stores it in 'res.locals'.
 *
 * @param {Request} req - The Express Request object.
 * @param {Response} res - The Express Response object.
 * @param {NextFunction} next - The next middleware function in the chain.
 * @returns {void}
 */
const passProjectName = (req: Request, res: Response, next: NextFunction): void => {
  res.locals.projectName = req.params.projectName;
  next();
};

export default { passProjectName };
