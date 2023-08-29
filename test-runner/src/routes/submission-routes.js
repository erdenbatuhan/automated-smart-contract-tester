const express = require("express");
const router = express.Router();

const submissionController = require("../controllers/submission-controller");
const routerUtils = require("../utils/router-utils");

/**
 * Downloads submission files
 * 
 * Note: The projectName must also be provided as a request parameter (see ../router.js)
 */
router.get("/:submissionId/download", async (req, res) => {
  try {
    const { projectName, submissionId } = routerUtils.extractRequiredParams(req, ["projectName", "submissionId"]);

    await submissionController.getSubmissionFilesInZipBuffer(submissionId).then((zipBuffer) => {
      res.setHeader("Content-Disposition", `attachment; filename=${projectName}_submission_${submissionId}.zip`);
      res.setHeader("Content-Type", "application/zip");
      res.status(200).send(zipBuffer);
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || "An error occurred." });
  }
});

module.exports = router;
