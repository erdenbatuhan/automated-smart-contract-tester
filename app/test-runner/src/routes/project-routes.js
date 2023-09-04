const express = require('express');

const router = express.Router();
const multer = require('multer');

const projectController = require('../controllers/project-controller');
const routerUtils = require('../utils/router-utils');

// Set up storage for uploaded ZIP files
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Uploads a new project or updated an existing one.
 *
 * The uploaded ZIP file should contain the necessary files and folders.
 *
 * @param {String} projectName.path.required - The name of the project.
 * @consumes multipart/form-data
 * @param {file} projectZip.formData.required - The ZIP file containing project files and folders.
 * @returns {Object} 200 - The created project.
 * @throws {HTTPError} 400 - If required parameters are missing or if the ZIP file is invalid.
 * @throws {HTTPError} 500 - If there's a server error.
 */
router.put('/:projectName/upload', upload.single('projectZip'), async (req, res) => {
  try {
    const { projectName } = routerUtils.extractRequiredParams(req, ['projectName']);
    const zipBuffer = routerUtils.extractFileBuffer(req);

    await projectController.createNewProject(projectName, zipBuffer).then((project) => {
      res.status(200).json(project);
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err ? err.message : 'An error occurred.' });
  }
});

module.exports = router;
