import express, { Request, Response } from 'express';
import multer from 'multer';

import projectController from '../controllers/project-controller';

import routerUtils from '../utils/router-utils';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Uploads a new project or updates an existing one.
 *
 * The uploaded ZIP file should contain the necessary files and folders.
 *
 * @param {string} projectName.path.required - The name of the project.
 * @consumes multipart/form-data
 * @param {file} projectZip.formData.required - The ZIP file containing project files and folders.
 * @returns {object} 200 - The created project.
 * @throws {object} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {object} 500 - If there's a server error.
 */
router.put('/:projectName/upload', upload.single('projectZip'), async (req: Request, res: Response) => {
  try {
    const { projectName } = routerUtils.extractRequiredParams(req, ['projectName']);
    const zipBuffer = routerUtils.extractFileBuffer(req);

    const project = await projectController.createNewProject(projectName, zipBuffer);
    res.status(200).json(project);
  } catch (err: Error | any) {
    res.status(err.statusCode || 500).json({ error: err ? err.message : 'An error occurred.' });
  }
});

export default router;
