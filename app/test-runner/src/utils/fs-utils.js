const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const tar = require('tar');

const Logger = require('../logging/logger');
const HTTPError = require('../errors/http-error');

const constantUtils = require('./constant-utils');

const readFile = (filename) => fs.readFileSync(filename, 'utf-8');

const checkIfFileExists = (dirPath, filename) => {
  if (!fs.existsSync(path.join(dirPath, filename))) throw new Error(`${filename} not found in ${dirPath}!`);
};

const unzip = async (tempDirPath, zipFilePath) => {
  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(tempDirPath, true); // Extract with overwrite

  // Get the first entry from the zip (assumed to be a directory)
  const firstEntry = zip.getEntries()[0];
  if (!firstEntry || !firstEntry.isDirectory) {
    throw new HTTPError(400, 'The uploaded zip file is either empty or does not unzip to a directory!');
  }

  // Replace the temporary directory with the unzipped directory
  const unzippedDirPath = path.join(tempDirPath, firstEntry.entryName);
  const swapDirPath = `${tempDirPath}_swap`;
  await fs.move(unzippedDirPath, swapDirPath); // Unzipped Directory -> Swap Directory
  await fs.remove(tempDirPath); // Remove: Temporary Directory
  await fs.move(swapDirPath, tempDirPath); // Swap -> Temporary Directory
};

const checkDirectoryContents = async (dirPath, { requiredFiles, requiredFolders }) => {
  const files = await fs.promises.readdir(dirPath);
  const directories = await fs.promises.readdir(dirPath, { withFileTypes: true })
    .then((entries) => entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));

  const missingFiles = requiredFiles.filter((file) => !files.includes(file));
  const missingDirectories = requiredFolders.filter((directory) => !directories.includes(directory));

  // If there are missing files or directories, remove the extracted directory and throw an error
  if (missingFiles.length > 0 || missingDirectories.length > 0) {
    throw new HTTPError(400, `Missing required files: ${missingFiles.join(', ')}, Missing required directories: ${missingDirectories.join(', ')}.`);
  }
};

const getDirectoryContentsStringified = async (dirPath, basePath = '') => {
  const contents = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      contents.push(...await getDirectoryContentsStringified(path.join(dirPath, entry.name), entryPath));
    } else if (entry.isFile()) {
      contents.push({
        path: entryPath,
        content: await fs.readFile(path.join(dirPath, entry.name), 'utf8')
      });
    }
  }

  return contents;
};

const removeDirectorySync = (dirPath) => {
  try {
    Logger.info(`Removing the directory (${dirPath}).`);
    fs.removeSync(dirPath);
    Logger.info(`Removed the directory (${dirPath})!`);
  } catch (err) {
    Logger.warn(`Could not remove the directory (${dirPath})!`);
  }
};

const readFromZipBuffer = async (
  contextName, zipBuffer, directoryRequirements = null, additionalSourcesCopied = []
) => {
  const dirPath = path.join(constantUtils.PATH_TEMP_DIR, contextName);
  const zipFilePath = path.join(dirPath, `${contextName}.zip`);

  try {
    Logger.info(`Reading ${contextName} from the zip buffer and writing it to a temporary directory.`);

    // Read from the zip buffer and extract the contents into the temporary directory
    await fs.promises.mkdir(dirPath, { recursive: true });
    await fs.promises.writeFile(zipFilePath, zipBuffer);
    await unzip(dirPath, zipFilePath);

    // Check if the uploaded contents match the required contents
    if (directoryRequirements) {
      await checkDirectoryContents(dirPath, directoryRequirements);
    }

    // // Get the uploaded contents as a list of strings along with their paths
    // const zipBufferContents = await getDirectoryContentsStringified(dirPath);

    // Copy additional files if there are any to the temporary directory (overwrites!)
    if (additionalSourcesCopied && Array.isArray(additionalSourcesCopied)) {
      for (const src of additionalSourcesCopied) {
        await fs.copy(src, dirPath, { overwrite: true });
      }
    }

    Logger.info(`Read ${contextName} from the zip buffer and wrote it to a temporary directory!`);
    return dirPath;
  } catch (err) {
    removeDirectorySync(dirPath);

    Logger.error(`An error occurred while reading ${contextName} from the zip buffer and writing it to a temporary directory!`);
    throw new HTTPError(err.statusCode || 500, err.message || 'An error occurred.');
  }
};

// Create a tarball, a readable tar stream
const createTarball = (cwd) => tar.c({ gzip: false, file: null, cwd }, ['.']);

const writeStringifiedContentsToZipBuffer = (contextName, contents) => {
  try {
    Logger.info(`Writing the stringified contents of ${contextName} to zip buffer.`);
    const zip = new AdmZip();

    contents.forEach((content) => {
      zip.addFile(content.path, Buffer.from(content.content, 'utf8'));
    });

    Logger.info(`Wrote the stringified contents of ${contextName} to zip buffer!`);
    return zip.toBuffer();
  } catch (err) {
    Logger.error(`An error occurred while writing the stringified contents of ${contextName} to zip buffer!`);
    throw new HTTPError(500, err.message || `An error occurred while writing the stringified contents of ${contextName} to zip buffer.`);
  }
};

module.exports = { checkIfFileExists, removeDirectorySync, readFromZipBuffer, createTarball };
