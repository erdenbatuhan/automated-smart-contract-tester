const fs = require("fs-extra");
const path = require("path");
const unzipper = require("unzipper");

const logger = require("./logger-utils");
const constantUtils = require("./constant-utils");
const HTTPError = require("../errors/http-error");

const checkDirectoryContents = async (extractedPath) => {
  const extractedFiles = await fs.promises.readdir(extractedPath);
  const extractedFolders = await fs.promises.readdir(extractedPath, { withFileTypes: true })
    .then(entries => entries.filter(entry => entry.isDirectory()).map(entry => entry.name));
  
  const missingFiles = constantUtils.UPLOAD_REQUIREMENT_FILES.filter(file => !extractedFiles.includes(file));
  const missingFolders = constantUtils.UPLOAD_REQUIREMENT_FOLDERS.filter(folder => !extractedFolders.includes(folder));

  // If there are missing files or folders, remove the extracted directory and throw an error
  if (missingFiles.length > 0 || missingFolders.length > 0) {
    throw new HTTPError(400, `Missing required files: ${missingFiles.join(", ")}, Missing required folders: ${missingFolders.join(", ")}.`)
  }
};

const readProjectFromZipBuffer = async (projectName, zipBuffer) => {
  logger.info(`Reading ${projectName} from the zip buffer and writing it to the projects folder..`);

  const tempFolderPath = path.join(constantUtils.PATH_ROOT, `temp_${Date.now()}`);
  const extractedProjectPath = path.join(tempFolderPath, projectName);
  const zipFilename = `${projectName}_temp.zip`;

  try {
    // Read from the zip buffer and unzip the contents in the temp folder
    await fs.promises.mkdir(tempFolderPath, { recursive: true });
    await fs.promises.writeFile(zipFilename, zipBuffer);
    await fs.createReadStream(zipFilename).pipe(unzipper.Extract({ path: tempFolderPath })).promise();
    await fs.remove(zipFilename);

    // Check if the contents match the required contents
    await checkDirectoryContents(extractedProjectPath);

    // Write extracted files and folders to the destination
    const destinationPath = path.join(constantUtils.PATH_PROJECTS_DIR, projectName);
    await fs.move(extractedProjectPath, destinationPath, { overwrite: true }); // Must overwrite!

    // Copy necessary files from the project template to the project folder
    await fs.copy(constantUtils.PATH_PROJECT_TEMPLATE, destinationPath, { overwrite: true }); // Must overwrite!
    logger.info(`Successfully read ${projectName} from the zip buffer and writing it to the projects folder!`);
  } catch (err) {
    logger.error(`An error occurred while reading ${projectName} from the zip buffer and writing it to the projects folder!`);
    throw new HTTPError(err.statusCode || 500, err.message || "An error occurred.");
  } finally {
    // Remove the temp folder
    try {
      await fs.remove(tempFolderPath);
    } catch (removalErr) {
      logger.error(`Could not remove the temp folder!`);
      throw new HTTPError(500, removalErr.message || `An error occurred while removing the temp folder (${tempFolderPath}).`);
    }
  }

  return projectName;
};

module.exports = { readProjectFromZipBuffer };
