import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';

import HTTPError from '@errors/http-error';

import type { TestExecutionArguments } from '@models/project';

import projectService from '@services/project-service';

import routerUtils from '@utils/router-utils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Creates a new project or updates an existing one.
 *
 * The uploaded ZIP file should contain the necessary files and folders.
 *
 * @param {string} projectName - The name of the project.
 * @consumes multipart/form-data
 * @param {file} projectZip - The ZIP file containing project files and folders.
 * @param {TestExecutionArguments} [execArgs] - "Optional" execution arguments for the tests.
 * @returns {object} 200 - The created project.
 * @throws {object} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {object} 500 - If there's a server error.
 */
router.put('/:projectName', upload.single('projectZip'), async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const requestFile = routerUtils.getRequestFile(req);
    const execArgs = routerUtils.parseJsonObjectFromBody(req, 'execArgs') as TestExecutionArguments;

    await projectService.saveProject(projectName, requestFile, execArgs).then((project) => {
      res.status(200).json(project);
    });
  } catch (err: HTTPError | Error | unknown) {
    res.status((err as HTTPError)?.statusCode || 500).json({ error: (err as Error)?.message });
  }
});

// TODO (1): Get Projects
// TODO (2): Get Project
// TODO (3): Download Project Files
// TODO (4): Edit Project Weights
// TODO (5): Remove Project

export default router;
