const express = require('express');

const router = express.Router();
const multer = require('multer');

const projectController = require('../controllers/project-controller');
const routerUtils = require('../utils/router-utils');

// Set up storage for uploaded ZIP files
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Uploads a new project
 *
 * The folder must contain:
 *  - Files: "remappings.txt", ".gitmodules"
 *  - Folders: "test", "solution"
 */
router.post('/:projectName/upload', upload.single('projectZip'), async (req, res) => {
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
