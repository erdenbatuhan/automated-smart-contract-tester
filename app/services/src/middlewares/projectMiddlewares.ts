import type { Request, Response, NextFunction } from 'express';

import projectServices from '@services/projectServices';

/**
 * Prepare the test runner service by uploading all projects to it.
 *
 * Do not handle any errors! The program should exit if this fails.
 *
 * @throws {AppError} - If the upload fails, throw an error and do not handle it.
 * @returns {Promise<void>} A Promise that resolves when the preparation is complete.
 */
const prepareTestRunnerService = async (): Promise<void> => { await projectServices.uploadAllProjectsToTestRunner(); };

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

export default { prepareTestRunnerService, passProjectName };
