import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';

import type AppError from '@errors/app-error';

import { IUser } from '@models/user';
import type { ITestExecutionArguments } from '@models/schemas/test-execution-arguments';

import authMiddlewares from '@middlewares/auth-middlewares';
import projectService from '@services/project-service';

import routerUtils, { RequestFile } from '@utils/router-utils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper function to handle project creation or update request.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {Function} saveFunction - The function to perform the action (create or update).
 * @returns {Promise<void>}
 */
const saveProject = async (
  req: Request, res: Response, saveFunction: (
    user: IUser, projectName: string, requestFile: RequestFile, execArgs: ITestExecutionArguments
  ) => Promise<object>
): Promise<object> => {
  const { user } = res.locals;
  const { projectName } = req.params;
  const requestFile = routerUtils.getRequestFile(req);
  const execArgs = routerUtils.parseJsonObjectFromBody(req, 'execArgs') as ITestExecutionArguments;

  return saveFunction(user as IUser, projectName, requestFile, execArgs);
};

/**
 * Retrieves all projects.
 *
 * @param {IUser} res.locals.user - The user performing the retrieval (see auth-middleware).
 * @returns {object} 200 - An array containing all projects.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/', authMiddlewares.requireUser, async (req: Request, res: Response) => {
  projectService.findAllProjects().then((projects) => {
    res.status(200).json(projects);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Retrieves a project by its name.
 *
 * @param {IUser} res.locals.user - The user performing the retrieval (see auth-middleware).
 * @param {string} req.params.projectName - The name of the project.
 * @returns {object} 200 - The project information.
 * @throws {object} 404 - If the project does not exist.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/:projectName', authMiddlewares.requireUser, async (req: Request, res: Response) => {
  const { projectName } = req.params;

  projectService.findProjectByName(projectName).then((project) => {
    res.status(200).json(project);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Uploads a new project.
 *
 * The uploaded ZIP file should contain the necessary files and folders.
 *
 * @param {IUser} res.locals.user - The user performing the upload (see auth-middleware).
 * @param {string} req.params.projectName - The name of the project.
 * @consumes multipart/form-data
 * @param {file} req.file.projectZip - The ZIP file containing project files and folders.
 * @param {string} [req.body.execArgs] - Optional execution arguments for the tests.
 * @returns {object} 201 - The created project.
 * @throws {object} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {object} 409 - If the project already exists.
 * @throws {object} 500 - If there's a server error.
 * @throws {object} 502 - If the external API call to the Test Runner service has failed without a specific request code.
 */
router.post('/:projectName/upload', authMiddlewares.requireAdmin, upload.single('projectZip'), async (req: Request, res: Response) => {
  saveProject(req, res, projectService.buildAndCreateProject).then((projectCreated) => {
    res.status(201).json(projectCreated);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Updates an existing project by uploading new files.
 *
 * The uploaded ZIP file should contain the necessary files and folders.
 *
 * @param {IUser} res.locals.user - The user performing the upload (see auth-middleware).
 * @param {string} req.params.projectName - The name of the project.
 * @consumes multipart/form-data
 * @param {file} projectZip - The ZIP file containing project files and folders.
 * @param {string} [req.body.execArgs] - Optional execution arguments for the tests.
 * @returns {object} 200 - The updated project.
 * @throws {object} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {object} 404 - If the project doesn't exist.
 * @throws {object} 500 - If there's a server error.
 * @throws {object} 502 - If the external API call to the Test Runner service has failed without a specific request code.
 */
router.put('/:projectName/upload', authMiddlewares.requireAdmin, upload.single('projectZip'), async (req: Request, res: Response) => {
  saveProject(req, res, projectService.rebuildAndUpdateProject).then((projectUpdated) => {
    res.status(200).json(projectUpdated);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Update test weights and execution arguments for an existing project using data from the request body.
 *
 * @param {IUser} res.locals.user - The user performing the update (see auth-middleware).
 * @param {string} req.params.projectName - The name of the project to update.
 * @param {object} req.body - The request body containing the following properties:
 * @param {ITest[]} [req.body.testsWithNewWeights] - An optional array of test objects with updated weights.
 * @param {ITestExecutionArguments} [req.body.updatedExecArgs] - Optional updated execution arguments for the project's tests.
 * @returns {object} 200 - The updated project.
 * @returns {object} 204 - If test weights and/or execution arguments are missing to update an existing project.
 * @throws {object} 400 - If required parameters are missing or if the request body is invalid.
 * @throws {object} 404 - If the project doesn't exist.
 * @throws {object} 500 - If there's a server error.
 */
router.put('/:projectName/update', authMiddlewares.requireAdmin, async (req: Request, res: Response) => {
  const { projectName } = req.params;
  const { tests, execArgs } = req.body;
  if (!tests || !execArgs) return res.status(204).end();

  return projectService.updateProjectTestWeightsAndExecutionArguments(projectName, tests, execArgs).then((projectUpdated) => {
    res.status(200).json(projectUpdated);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Downloads the uploaded files associated with a project.
 *
 * @param {IUser} res.locals.user - The user requesting the download (see auth-middleware).
 * @param {string} req.params.projectName - The name of the project associated with the files downloaded.
 * @returns {object} 200 - The downloadable zip buffer.
 * @throws {object} 404 - If the project doesn't exist.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/:projectName/download', authMiddlewares.requireAdmin, async (req: Request, res: Response) => {
  const { projectName } = req.params;

  projectService.downloadProjectFiles(projectName).then((zipBuffer) => {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="project_${projectName}.zip"`);

    res.status(200).send(zipBuffer);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Deletes a project.
 *
 * @param {IUser} res.locals.user - The user performing the removal (see auth-middleware).
 * @param {string} req.params.projectName - The name of the project to delete.
 * @returns {object} 204 - If the project deletion is successful.
 * @throws {object} 404 - If the project doesn't exist.
 * @throws {object} 500 - If there's a server error.
 */
router.delete('/:projectName', authMiddlewares.requireAdmin, async (req: Request, res: Response) => {
  const { projectName } = req.params;

  projectService.deleteProject(projectName).then(() => {
    res.status(204).end();
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

export default router;
