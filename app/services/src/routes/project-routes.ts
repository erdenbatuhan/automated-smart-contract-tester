import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';

import type AppError from '@errors/app-error';

import type { TestExecutionArguments } from '@models/project';

import projectService from '@services/project-service';

import routerUtils, { RequestFile } from '@utils/router-utils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Handle project creation or update request.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {Function} saveFunction - The function to perform the action (create or update).
 * @returns {Promise<void>}
 */
const saveProject = async (
  req: Request, res: Response, saveFunction: (
    projectName: string, requestFile: RequestFile, execArgs: TestExecutionArguments
  ) => Promise<object>
): Promise<object> => {
  const { projectName } = req.params;
  const requestFile = routerUtils.getRequestFile(req);
  const execArgs = routerUtils.parseJsonObjectFromBody(req, 'execArgs') as TestExecutionArguments;

  return saveFunction(projectName, requestFile, execArgs);
};

/**
 * Creates a new project.
 *
 * The uploaded ZIP file should contain the necessary files and folders.
 *
 * @param {string} projectName - The name of the project.
 * @consumes multipart/form-data
 * @param {file} projectZip - The ZIP file containing project files and folders.
 * @param {TestExecutionArguments} [execArgs] - Optional execution arguments for the tests.
 * @returns {object} 201 - The created project.
 * @throws {object} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {object} 409 - If the project already exists.
 * @throws {object} 500 - If there's a server error.
 */
router.post('/:projectName', upload.single('projectZip'), async (req: Request, res: Response) => {
  saveProject(req, res, projectService.createNewProject).then((projectCreated) => {
    res.status(201).json(projectCreated);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
  });
});

/**
 * Updates an existing project.
 *
 * The uploaded ZIP file should contain the necessary files and folders.
 *
 * @param {string} projectName - The name of the project.
 * @consumes multipart/form-data
 * @param {file} projectZip - The ZIP file containing project files and folders.
 * @param {TestExecutionArguments} [execArgs] - Optional execution arguments for the tests.
 * @returns {object} 200 - The updated project.
 * @throws {object} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {object} 404 - If the project doesn't exist.
 * @throws {object} 500 - If there's a server error.
 */
router.put('/:projectName', upload.single('projectZip'), async (req: Request, res: Response) => {
  saveProject(req, res, projectService.updateExistingProject).then((projectCreated) => {
    res.status(200).json(projectCreated);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
  });
});

// TODO (1): Get Projects
// TODO (2): Get Project
// TODO (3): Download Project Files
// TODO (4): Edit Project Weights
// TODO (5): Remove Project

export default router;
