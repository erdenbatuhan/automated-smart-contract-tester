const express = require("express");
const router = express.Router();

const executionController = require("../controllers/execution-controller");
const routerUtils = require("../utils/router-utils");

/**
 * Downloads execution files
 * 
 * Note: The projectName must also be provided as a request parameter (see ../router.js)
 */
router.get("/:executionId/download", async (req, res) => {
  try {
    const { projectName, executionId } = routerUtils.extractRequiredParams(req, ["projectName", "executionId"]);

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
