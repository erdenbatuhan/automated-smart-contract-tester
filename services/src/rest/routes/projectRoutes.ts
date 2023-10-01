import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { HttpStatusCode } from 'axios';

import AppError from '@errors/AppError';

import type { IUser } from '@models/User';
import type { IProjectConfig } from '@models/schemas/ProjectConfigSchema';
import { testExecutionArgumentDescriptions } from '@models/schemas/TestExecutionArgumentsSchema';

import authMiddlewares from '@middlewares/authMiddlewares';

import projectServices from '@services/projectServices';
import projectMessageProducers from '@rabbitmq/test-runner/producers/projectMessageProducers';

import routerUtils from '@utils/routerUtils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper function to handle project creation or update request.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {typeof projectServices.buildAndCreateProject} saveFunction - The function to perform the action (create or update).
 * @returns {Promise<void>}
 */
const saveProject = async (
  req: Request, res: Response, saveFunction: typeof projectServices.buildAndCreateProject
): Promise<object> => {
  const { user } = res.locals;
  const { projectName } = req.params;
  const zipBuffer = routerUtils.getZipBuffer(req) as Buffer;
  const projectConfig = routerUtils.parseJsonObjectFromBody(req, 'projectConfig') as IProjectConfig;

  // Create or update the project
  const project = await saveFunction(user as IUser, projectName, zipBuffer, projectConfig);

  // Upload the project to the test runner service
  const messageRequest = await projectMessageProducers.produceProjectUploadMessage(user, zipBuffer, project);

  const leanMessageRequest = messageRequest.toLean();
  const leanProject = project.toLean();

  return { messageRequest: leanMessageRequest, project: leanProject };
};

/**
 * Retrieves descriptions of test execution arguments.
 *
 * @param {IUser} res.locals.user - The user performing the retrieval (see authMiddlewares).
 * @returns {object} 200 - Descriptions of test execution arguments.
 * @throws {object} 500 - Server error.
 */
router.get('/descriptions/test-execution-arguments', authMiddlewares.requireUser, async (req: Request, res: Response) => {
  res.status(HttpStatusCode.Ok).json(testExecutionArgumentDescriptions);
});

/**
 * Retrieves all projects.
 *
 * @param {IUser} res.locals.user - The user performing the retrieval (see authMiddlewares).
 * @returns {object} 200 - An array containing all projects.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/', authMiddlewares.requireUser, async (req: Request, res: Response) => {
  projectServices.findAllProjects().then((projects) => {
    const leanProjects = projects.map((project) => project.toLean());
    res.status(HttpStatusCode.Ok).json(leanProjects);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Retrieves a project by its name.
 *
 * @param {IUser} res.locals.user - The user performing the retrieval (see authMiddlewares).
 * @param {string} req.params.projectName - The name of the project.
 * @returns {object} 200 - The project information.
 * @throws {object} 404 - If the project does not exist.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/:projectName', authMiddlewares.requireUser, async (req: Request, res: Response) => {
  const { projectName } = req.params;

  projectServices.findProjectByName(projectName).then((project) => {
    const leanProject = project.toLean();
    res.status(HttpStatusCode.Ok).json(leanProject);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Uploads a new project.
 *
 * The uploaded ZIP file should contain the necessary files and folders.
 *
 * @param {IUser} res.locals.user - The user performing the upload (see authMiddlewares).
 * @param {string} req.params.projectName - The name of the project.
 * @consumes multipart/form-data
 * @param {file} req.file.projectZip - The ZIP file containing project files and folders.
 * @param {IProjectConfig} [req.body.projectConfig] - Optional project config for the tests.
 * @returns {object} 201 - The created project.
 * @throws {object} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {object} 409 - If the project already exists.
 * @throws {object} 500 - If there's a server error.
 * @throws {object} 502 - If the external API call to the Test Runner service has failed without a specific request code.
 */
router.post('/:projectName/upload', authMiddlewares.requireAdmin, upload.single('projectZip'), async (req: Request, res: Response) => {
  saveProject(req, res, projectServices.buildAndCreateProject).then((projectCreated) => {
    res.status(HttpStatusCode.Created).json(projectCreated);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Updates an existing project by uploading new files.
 *
 * The uploaded ZIP file should contain the necessary files and folders.
 *
 * @param {IUser} res.locals.user - The user performing the upload (see authMiddlewares).
 * @param {string} req.params.projectName - The name of the project.
 * @consumes multipart/form-data
 * @param {file} req.file.projectZip - The ZIP file containing project files and folders.
 * @param {IProjectConfig} [req.body.projectConfig] - Optional project config for the tests.
 * @returns {object} 200 - The updated project.
 * @throws {object} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {object} 404 - If the project doesn't exist.
 * @throws {object} 500 - If there's a server error.
 * @throws {object} 502 - If the external API call to the Test Runner service has failed without a specific request code.
 */
router.put('/:projectName/upload', authMiddlewares.requireAdmin, upload.single('projectZip'), async (req: Request, res: Response) => {
  saveProject(req, res, projectServices.rebuildAndUpdateProject).then((projectUpdated) => {
    res.status(HttpStatusCode.Ok).json(projectUpdated);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Update test weights and execution arguments for an existing project using data from the request body.
 *
 * @param {IUser} res.locals.user - The user performing the update (see authMiddlewares).
 * @param {string} req.params.projectName - The name of the project to update.
 * @param {IProjectConfig} req.body.updatedConfig - The object containing updated project configuration values for the tests.
 * @returns {object} 200 - The updated project.
 * @returns {object} 204 - If test weights and/or execution arguments are missing to update an existing project.
 * @throws {object} 400 - If required parameters are missing or if the request body is invalid.
 * @throws {object} 404 - If the project doesn't exist.
 * @throws {object} 500 - If there's a server error.
 */
router.put('/:projectName/update', authMiddlewares.requireAdmin, async (req: Request, res: Response) => {
  const { projectName } = req.params;
  const updatedConfig = req.body as IProjectConfig;
  if (!updatedConfig) {
    return routerUtils.sendErrorResponse(res, new AppError(HttpStatusCode.BadRequest, 'Missing project config!'));
  }

  return projectServices.updateProjectConfig(projectName, updatedConfig).then((projectUpdated) => {
    res.status(HttpStatusCode.Ok).json(projectUpdated);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Downloads the uploaded files associated with a project.
 *
 * @param {IUser} res.locals.user - The user requesting the download (see authMiddlewares).
 * @param {string} req.params.projectName - The name of the project associated with the files downloaded.
 * @returns {object} 200 - The downloadable zip buffer.
 * @throws {object} 404 - If the project doesn't exist.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/:projectName/download', authMiddlewares.requireAdmin, async (req: Request, res: Response) => {
  const { projectName } = req.params;

  projectServices.downloadProjectFiles(projectName).then((zipBuffer) => {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="project_${projectName}.zip"`);

    res.status(HttpStatusCode.Ok).send(zipBuffer);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.sendErrorResponse(res, err);
  });
});

/**
 * Deletes a project.
 *
 * @param {IUser} res.locals.user - The user performing the removal (see authMiddlewares).
 * @param {string} req.params.projectName - The name of the project to delete.
 * @returns {object} 200 - If the project deletion is successful.
 * @throws {object} 404 - If the project doesn't exist.
 * @throws {object} 500 - If there's a server error.
 */
router.delete('/:projectName', authMiddlewares.requireAdmin, async (req: Request, res: Response) => {
  try {
    const { user } = res.locals;
    const { projectName } = req.params;

    // Delete the project
    const project = await projectServices.deleteProject(projectName);

    // Send the deletion request to test runner service
    const messageRequest = await projectMessageProducers.produceProjectRemovalMessage(user, project);

    const leanMessageRequest = messageRequest.toLean();
    const leanProject = project.toLean();

    res.status(HttpStatusCode.Ok).json({ messageRequest: leanMessageRequest, project: leanProject });
  } catch (err: AppError | Error | unknown) {
    routerUtils.sendErrorResponse(res, err);
  }
});

export default router;
