const fs = require("fs-extra");
const path = require("path");
const AdmZip = require("adm-zip");

const logger = require("./logger-utils");
const constantUtils = require("./constant-utils");
const HTTPError = require("../errors/http-error");

const readFile = (filename) => fs.readFileSync(filename, "utf-8");

const checkDirectoryContents = async (dirPath, { requiredFiles, requiredFolders }) => {
  const files = await fs.promises.readdir(dirPath);
  const directories = await fs.promises.readdir(dirPath, { withFileTypes: true })
    .then(entries => entries.filter(entry => entry.isDirectory()).map(entry => entry.name));
  
  const missingFiles = requiredFiles.filter(file => !files.includes(file));
  const missingDirectories = requiredFolders.filter(directory => !directories.includes(directory));

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

const removeDirectory = async (dirPath) => {
  try {
    logger.info(`Removing the directory (${dirPath})..`);
    await fs.remove(dirPath);
    logger.info(`Removed the directory (${dirPath})!`);
  } catch (err) {
    logger.warn(`Could not remove the directory (${dirPath})!`);
  }
};

const readFromZipBuffer = async (contentName, zipBuffer, directoryRequirements=null, additionalSourcesCopied=[]) => {
  let tempDirPath;

  try {
    logger.info(`Reading ${contentName} from the zip buffer and writing it to a temporary directory..`);

    tempDirPath = path.join(constantUtils.PATH_ROOT, `temp_${contentName}_${Date.now()}`);
    const zipFilePath = path.join(tempDirPath, `${contentName}_temp.zip`);

    // Read from the zip buffer and extract the contents into the temporary directory
    await fs.promises.mkdir(tempDirPath, { recursive: true });
    await fs.promises.writeFile(zipFilePath, zipBuffer);
    const unzippedDirPath = unzip(tempDirPath, zipFilePath);

    // Check if the uploaded contents match the required contents
    if (directoryRequirements) {
      await checkDirectoryContents(unzippedDirPath, directoryRequirements);
    }

    // Get the uploaded contents as a list of strings along with their paths
    const zipBufferContents = await getDirectoryContentsStringified(unzippedDirPath);

    // Copy the uploaded files from the unzipped directory to the temporary directory
    await fs.copy(unzippedDirPath, tempDirPath);

    // Copy additional files if there are any to the temporary directory (overwrites!)
    if (additionalSourcesCopied && Array.isArray(additionalSourcesCopied)) {
      for (const src of additionalSourcesCopied) {
        await fs.copy(src, tempDirPath, { overwrite: true });
      }
    }

    logger.info(`Read ${contentName} from the zip buffer and wrote it to a temporary directory!`);
    return [tempDirPath, zipBufferContents];
  } catch (err) {
    logger.error(`An error occurred while reading ${contentName} from the zip buffer and writing it to a temporary directory!`);

    // Remove the temporary directory in case of an error and then throw the error
    await removeDirectory(tempDirPath);
    throw new HTTPError(err.statusCode || 500, err.message || "An error occurred.");
  }
};

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
};

module.exports = { readFile, readFromZipBuffer, removeDirectory, writeStringifiedContentsToZipBuffer };
