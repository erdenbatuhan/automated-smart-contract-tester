const express = require("express");
const multer = require("multer");
const fsUtils = require("./src/utils/fs-utils");
const dockerUtils = require("./src/utils/docker-utils");

// Set up storage for uploaded ZIP files
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();
const PORT = 8008;

app.use(express.json());

/**
 * Upload a new project
 * 
 * The folder must contain:
 *  - Files: "remappings.txt", ".gitmodules"
 *  - Folders: "test", "src", "solution"
 */
app.post("/projects/:projectName/upload", upload.single("projectZip"), async (req, res) => {
  try {
    const projectName = req.params.projectName;
    const zipBuffer = req.file.buffer;

    await fsUtils.readProjectFromZipBuffer(projectName, zipBuffer);

    dockerUtils.createDockerImage("bbse-bank-2.0").then((imageId) => {
      res.status(200).json({ message: `Docker image (${imageId}) created!` });
    }).catch(err => {
      res.status(err.statusCode || 500).json({ error: err.message || "An error occurred." });
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || "An error occurred." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
