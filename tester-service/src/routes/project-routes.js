const express = require("express");
const router = express.Router();
const multer = require("multer");

const projectController = require("../controllers/project-controller");

// Set up storage for uploaded ZIP files
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Upload a new project
 * 
 * The folder must contain:
 *  - Files: "remappings.txt", ".gitmodules"
 *  - Folders: "test", "src", "solution"
 */
router.post("/:projectName/upload", upload.single("projectZip"), async (req, res) => {
  let projectName, zipBuffer;

  try {
    projectName = req.params.projectName;
    zipBuffer = req.file.buffer;
  } catch (err) {
    return res.status(400).json({ error: err.message || "An error occurred while reading the parameters." });
  }

  projectController.createNewProject(projectName, zipBuffer).then((project) => {
    res.status(200).json(project);
  }).catch(err => {
    res.status(err.statusCode || 500).json({ error: err.message || "An error occurred." });
  });
});

module.exports = router;
