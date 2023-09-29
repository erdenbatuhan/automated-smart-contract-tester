import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { HttpStatusCode } from 'axios';

import type AppError from '@errors/AppError';

import projectServices from '@services/projectServices';

import routerUtils from '@utils/routerUtils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Uploads a new project or updates an existing one.
 *
 * The uploaded ZIP file should contain the necessary files and folders (Refer to @utils/constant-utils.ts).
 *
 * @param {string} res.locals.projectName - The name of the project (see projectMiddlewares).
 * @consumes multipart/form-data
 * @param {file} req.file.projectZip - The ZIP file containing project files and folders.
 * @param {object} [req.query.containerTimeout] - "Optional" timeout for container execution in seconds.
 * @param {object} [req.body.execArgs] - "Optional" execution arguments for the tests.
 * @returns {object} 201 - If the project is created successfully, returns the created project.
 * @returns {object} 200 - If the project is updated successfully, returns the updated project.
 * @throws {object} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {object} 500 - If there's a server error.
 */
router.put('/:projectName/upload', upload.single('projectZip'), async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const zipBuffer = routerUtils.extractFileBuffer(req);
    const containerTimeout = req.query?.containerTimeout ? Number(req.query.containerTimeout) : undefined;
    const execArgs = routerUtils.parseJsonObjectFromBody(req, 'execArgs');

    await projectServices.saveProject(projectName, zipBuffer, { containerTimeout, execArgs }).then(({ isNew, project }) => {
      res.status(isNew ? HttpStatusCode.Created : HttpStatusCode.Ok).json(project);
    });
  } catch (err: AppError | Error | unknown) {
    routerUtils.sendErrorResponse(res, err);
  }
});

export default router;
