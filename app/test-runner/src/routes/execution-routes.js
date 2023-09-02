const express = require('express');

const router = express.Router();
const multer = require('multer');

const executionController = require('../controllers/execution-controller');
const routerUtils = require('../utils/router-utils');

// Set up storage for uploaded ZIP files
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Uploads the smarts contracts that the tests will be run against
 *
 * The folder must contain the smart contracts! (src folder)
 */
router.post('/', upload.single('srcZip'), async (req, res) => {
  try {
    const { projectName } = req.locals;
    const zipBuffer = routerUtils.extractFileBuffer(req);

    await executionController.executeTests(projectName, zipBuffer).then((execution) => {
      res.status(200).json(execution);
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err ? err.message : 'An error occurred.' });
  }
});

module.exports = router;
