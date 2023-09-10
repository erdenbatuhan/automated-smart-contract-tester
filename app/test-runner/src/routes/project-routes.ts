import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';

import type AppError from '@errors/app-error';

import projectService from '@services/project-service';

import routerUtils from '@utils/router-utils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Uploads a new project or updates an existing one.
 *
 * The uploaded ZIP file should contain the necessary files and folders (Refer to @utils/constant-utils.ts).
 *
 * @param {string} projectName - The name of the project.
 * @consumes multipart/form-data
 * @param {file} projectZip - The ZIP file containing project files and folders.
 * @returns {object} 201 - If the project is created successfully, returns the created project.
 * @returns {object} 200 - If the project is updated successfully, returns the updated project.
 * @throws {object} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {object} 500 - If there's a server error.
 */
router.put('/:projectName/upload', upload.single('projectZip'), async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const zipBuffer = routerUtils.extractFileBuffer(req);

    await projectService.saveProject(projectName, zipBuffer).then(({ isNew, project }) => {
      res.status(isNew ? 201 : 200).json(project);
    });
  } catch (err: AppError | Error | unknown) {
    routerUtils.handleError(res, err);
  }
});

export default router;
