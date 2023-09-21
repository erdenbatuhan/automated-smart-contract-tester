import type { Request, Response, NextFunction } from 'express';

import Logger from '@Logger';

import projectServices from '@services/projectServices';
import projectMessageProducers from '@rabbitmq/test-runner/producers/projectMessageProducers';

/**
 * Prepare the test runner service by uploading all projects to it.
 *
 * This function initiates the process of uploading all projects to the test runner service.
 * Any errors encountered during this process are not handled, and the program will exit if an error occurs.
 *
 * @throws {AppError} - If the upload fails, it throws an AppError.
 * @returns {Promise<void>} A Promise that resolves when the preparation is complete.
 */
const prepareTestRunnerService = async (): Promise<string[]> => {
  Logger.info('Initiating the preparation of the test runner service by uploading all projects in the DB and building their Docker images.');
  const projectFiles = await projectServices.downloadFilesForAllProjects();

  if (!projectFiles?.length) {
    Logger.warn('No projects found in the DB! Was this expected?');
    return [];
  }

  return Promise.all(projectFiles.map(({ project, zipBuffer }) => (
    projectMessageProducers.produceProjectUploadMessage(null, zipBuffer, project)
  ))).then((messageRequests) => {
    const messageRequestIds = messageRequests.map(({ _id }) => String(_id));

    Logger.info(`Successfully downloaded the files for ${messageRequests.length} project(s) and uploaded them to the test runner service. Message request IDs: ${messageRequestIds}`);
    return messageRequestIds;
  }).catch((err: Error | unknown) => {
    Logger.error(`Failed to download the uploaded files for all projects and upload them to the test runner service: ${(err as Error)?.message}`);
    throw err;
  });
};

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
