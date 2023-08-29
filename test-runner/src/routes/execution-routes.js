const express = require("express");
const router = express.Router();
const multer = require("multer");

const executionController = require("../controllers/execution-controller");
const routerUtils = require("../utils/router-utils");

// Set up storage for uploaded ZIP files
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Uploads the smarts contracts that the tests will be run against
 * 
 * The folder must contain the smart contracts! (src folder)
 */
router.post("/", upload.single("srcZip"), async (req, res) => {
  try {
    const projectName = req.locals.projectName;
    const zipBuffer = routerUtils.extractFileBuffer(req);

    await executionController.runDockerContainer(projectName, zipBuffer).then((execution) => {
      res.status(200).json(execution);
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || "An error occurred." });
  }
});

/**
 * Downloads execution files
 * 
 * Note: The projectName must also be provided as a request parameter (see ../router.js)
 */
router.get("/:executionId/download", async (req, res) => {
  try {
    const projectName = req.locals.projectName;
    const { executionId } = routerUtils.extractRequiredParams(req, ["executionId"]);

    await executionController.getExecutionFilesInZipBuffer(executionId).then((zipBuffer) => {
      res.setHeader("Content-Disposition", `attachment; filename=${projectName}_execution_${executionId}.zip`);
      res.setHeader("Content-Type", "application/zip");
      res.status(200).send(zipBuffer);
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || "An error occurred." });
  }
});

module.exports = router;
