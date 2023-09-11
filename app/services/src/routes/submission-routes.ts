import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';

import type AppError from '@errors/app-error';

import submissionService from '@services/submission-service';

import routerUtils from '@utils/router-utils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Retrieves all submissions.
 *
 * @returns {object} 200 - An array containing all submissions.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/', async (req: Request, res: Response) => {
  submissionService.findAllSubmissions().then((submissions) => {
    res.status(200).json(submissions);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
  });
});

/**
 * Retrieves a submission by its ID.
 *
 * @param {string} res.locals.projectName - The name of the project (see api-routes.ts).
 * @param {string} req.params.submissionId - The ID of the submission.
 * @returns {object} 200 - The submission information.
 * @throws {object} 404 - If the submission does not exist.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/:submissionId', async (req: Request, res: Response) => {
  const { submissionId } = req.params;

  submissionService.findSubmissionById(submissionId).then((submission) => {
    res.status(200).json(submission);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
  });
});

/**
 * Uploads the submission of smart contracts that will be tested.
 *
 * The uploaded ZIP file must contain the smart contracts (src folder).
 *
 * @param {string} res.locals.projectName - The name of the project associated with the tests (see api-routes.ts).
 * @consumes multipart/form-data
 * @param {file} req.file.srcZip - The ZIP file containing the smart contracts to be tested.
 * @returns {object} 201 - The submission created.
 * @throws {object} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {object} 404 - If the project does not exist.
 * @throws {object} 500 - If there's a server error.
 * @throws {object} 502 - If the external API call to the Test Runner service has failed without a specific request code.
 */
router.post('/', upload.single('srcZip'), async (req: Request, res: Response) => {
  try {
    const { projectName } = res.locals;
    const requestFile = routerUtils.getRequestFile(req);

    await submissionService.runAndCreateSubmission(projectName, requestFile).then((submission) => {
      res.status(201).json(submission);
    });
  } catch (err: AppError | Error | unknown) {
    routerUtils.handleError(res, err);
  }
});

/**
 * Downloads the uploaded files associated with a submission.
 *
 * @param {string} res.locals.projectName - The name of the project associated with the tests (see api-routes.ts).
 * @param {string} req.params.submissionId - The ID of the submission associated with the files downloaded.
 * @returns {object} 200 - The downloadable zip buffer.
 * @throws {object} 404 - If the submission doesn't exist.
 * @throws {object} 500 - If there's a server error.
 */
router.get('/:submissionId/download', async (req: Request, res: Response) => {
  const { projectName } = res.locals;
  const { submissionId } = req.params;

  submissionService.downloadSubmissionFiles(submissionId).then((zipBuffer) => {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="project_${projectName}_submission_${submissionId}.zip"`);

    res.status(200).send(zipBuffer);
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
  });
});

/**
 * Deletes a submission.
 *
 * @param {string} res.locals.projectName - The name of the project associated with the tests (see api-routes.ts).
 * @param {string} req.params.submissionName - The name of the submission to delete.
 * @returns {object} 204 - If the submission deletion is successful.
 * @throws {object} 404 - If the submission doesn't exist.
 * @throws {object} 500 - If there's a server error.
 */
router.delete('/:submissionId', async (req: Request, res: Response) => {
  const { submissionId } = req.params;

  submissionService.deleteSubmissionById(submissionId).then(() => {
    res.status(204).end();
  }).catch((err: AppError | Error | unknown) => {
    routerUtils.handleError(res, err);
  });
});

export default router;
