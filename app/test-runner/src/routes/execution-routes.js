const express = require('express');

const router = express.Router();
const multer = require('multer');

const executionController = require('../controllers/execution-controller');
const routerUtils = require('../utils/router-utils');

// Set up storage for uploaded ZIP files
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Uploads the smart contracts that the tests will be run against.
 *
 * The uploaded ZIP file must contain the smart contracts in a 'src' folder.
 *
 * @param {file} srcZip.formData.required - The ZIP file containing the smart contracts to be tested.
 * @param {String} projectName.query.required - The name of the project associated with the tests.
 * @returns {Object} 200 - The execution result, including test output and details.
 * @returns {Object} 400 - Bad request error, such as missing parameters or invalid file format.
 * @returns {Object} 500 - Internal server error, indicating a failure during execution.
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
