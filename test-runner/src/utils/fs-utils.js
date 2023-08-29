const fs = require("fs-extra");
const path = require("path");
const AdmZip = require("adm-zip");

const logger = require("./logger-utils");
const constantUtils = require("./constant-utils");
const HTTPError = require("../errors/http-error");

const readFile = (filename) => fs.readFileSync(filename, "utf-8");

const checkDirectoryContents = async (dirPath) => {
  const files = await fs.promises.readdir(dirPath);
  const directories = await fs.promises.readdir(dirPath, { withFileTypes: true })
    .then(entries => entries.filter(entry => entry.isDirectory()).map(entry => entry.name));
  
  const missingFiles = constantUtils.UPLOAD_REQUIREMENT_FILES.filter(file => !files.includes(file));
  const missingDirectories = constantUtils.UPLOAD_REQUIREMENT_FOLDERS.filter(directory => !directories.includes(directory));

  // If there are missing files or directories, remove the extracted directory and throw an error
  if (missingFiles.length > 0 || missingDirectories.length > 0) {
    throw new HTTPError(400, `Missing required files: ${missingFiles.join(", ")}, Missing required directories: ${missingDirectories.join(", ")}.`)
  }
};

const getDirectoryContentsStringified = async (dirPath, basePath="") => {
  const contents = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      contents.push(...await getDirectoryContentsStringified(path.join(dirPath, entry.name), entryPath));
    } else if (entry.isFile()) {
      contents.push({
        path: entryPath,
        content: await fs.readFile(path.join(dirPath, entry.name), "utf8")
      });
    }
  }

  return contents;
};

const unzip = (tempDirPath, zipFilePath) => {
  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(tempDirPath, true); // Extract with overwrite

  // Get the first entry from the zip (assumed to be a directory)
  const firstEntry = zip.getEntries()[0];
  if (!firstEntry || !firstEntry.isDirectory) {
    throw new HTTPError(400, "The uploaded zip file is either empty or does not unzip to a directory!");
  }

  // Return the path of the unzipped directory
  return path.join(tempDirPath, firstEntry.entryName);
};

const readFromZipBuffer = async (contentName, zipBuffer) => {
  try {
    logger.info(`Reading ${contentName} from the zip buffer and writing it to a temporary directory..`);
  
    const tempDirPath = path.join(constantUtils.PATH_ROOT, `temp_${contentName}_${Date.now()}`);
    const zipFilePath = path.join(tempDirPath, `${contentName}_temp.zip`);

    // Read from the zip buffer and extract the contents into the temporary directory
    await fs.promises.mkdir(tempDirPath, { recursive: true });
    await fs.promises.writeFile(zipFilePath, zipBuffer);
    const unzippedDirPath = unzip(tempDirPath, zipFilePath);

    // Check if the uploaded contents match the required contents
    await checkDirectoryContents(unzippedDirPath);

    // Get the uploaded contents as a list of strings along with their paths
    const zipBufferContents = await getDirectoryContentsStringified(unzippedDirPath);

    // Copy (1) and (2) to the temporary directory
    await Promise.all([
      fs.copy(unzippedDirPath, tempDirPath), // (1) Uploaded files in the unzipped directory
      fs.copy(constantUtils.PATH_PROJECT_TEMPLATE, tempDirPath, { overwrite: true }) // (2) Necessary files in the project template (Must overwrite!)
    ]);

    logger.info(`Read ${contentName} from the zip buffer and wrote it to a temporary directory!`);
    return [tempDirPath, zipBufferContents];
  } catch (err) {
    logger.error(`An error occurred while reading ${contentName} from the zip buffer and writing it to a temporary directory!`);
    throw new HTTPError(err.statusCode || 500, err.message || "An error occurred.");
  }
};

const removeDirectory = async (dirPath) => {
  try {
    logger.info(`Removing the directory (${dirPath})..`);
    await fs.remove(dirPath);
    logger.info(`Removed the directory (${dirPath})!`);
  } catch (err) {
    logger.error(`Could not remove the directory (${dirPath})!`);
    throw new HTTPError(500, err.message || `An error occurred while removing the directory (${dirPath}).`);
  }
}

const writeStringifiedContentsToZipBuffer = (contentName, contents) => {
  try {
    logger.info(`Writing the stringified contents of ${contentName} to zip buffer..`);
    const zip = new AdmZip();

    contents.forEach(content => {
      zip.addFile(content.path, Buffer.from(content.content, "utf8"));
    });

    logger.info(`Wrote the stringified contents of ${contentName} to zip buffer!`);
    return zip.toBuffer();
  } catch (err) {
    logger.error(`An error occurred while writing the stringified contents of ${contentName} to zip buffer!`);
    throw new HTTPError(500, err.message || `An error occurred while writing the stringified contents of ${contentName} to zip buffer.`);
  }
}

module.exports = { readFile, readFromZipBuffer, removeDirectory, writeStringifiedContentsToZipBuffer };
