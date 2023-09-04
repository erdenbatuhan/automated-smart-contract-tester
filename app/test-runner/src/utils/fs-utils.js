const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const tar = require('tar');

const Logger = require('../logging/logger');
const HTTPError = require('../errors/http-error');

const constantUtils = require('./constant-utils');

/**
 * Check if a file exists within a directory.
 *
 * @param {String} dirPath - The directory path.
 * @param {String} filename - The name of the file to check.
 * @throws {Error} If the file does not exist in the directory.
 */
const checkIfFileExists = (dirPath, filename) => {
  if (!fs.existsSync(path.join(dirPath, filename))) throw new Error(`${filename} not found in ${dirPath}!`);
};

/**
 * Unzip a file to a specified directory.
 *
 * @param {String} tempDirPath - The path to the temporary directory.
 * @param {String} zipFilePath - The path to the zip file to extract.
 * @throws {HTTPError} If the zip file is empty or does not unzip to a directory.
 */
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

/**
 * Check the contents of a directory against required files and folders.
 *
 * @param {String} dirPath - The path to the directory.
 * @param {Object} requirements - An object containing requiredFiles and requiredFolders arrays.
 * @param {String[]} requirements.requiredFiles - An array of required file names.
 * @param {String[]} requirements.requiredFolders - An array of required folder names.
 * @throws {HTTPError} If required files or folders are missing in the directory.
 */
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

/**
 * Remove a directory synchronously.
 *
 * @param {String} dirPath - The path to the directory to remove.
 */
const removeDirectorySync = (dirPath) => {
  try {
    Logger.info(`Removing the directory (${dirPath}).`);
    fs.removeSync(dirPath);
    Logger.info(`Removed the directory (${dirPath})!`);
  } catch (err) {
    Logger.warn(`Could not remove the directory (${dirPath})!`);
  }
};

/**
 * Read data from a zip buffer and write it to a temporary directory.
 *
 * @param {String} contextName - The name of the context for logging purposes.
 * @param {Buffer} zipBuffer - The zip buffer to read from.
 * @param {Object|null} directoryRequirements - An optional object containing requiredFiles and requiredFolders arrays.
 * @param {String[]} additionalSourcesCopied - An optional array of additional sources to copy to the temporary directory.
 * @returns {Promise<String>} A promise that resolves to the path of the temporary directory.
 * @throws {HTTPError} If an error occurs while reading or validating the zip buffer.
 */
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

/**
 * Create a tarball (a readable tar stream) from a specified directory.
 *
 * @param {String} cwd - The current working directory for creating the tarball.
 * @returns {ReadStream} A readable tar stream.
 */
const createTarball = (cwd) => tar.c({ gzip: false, file: null, cwd }, ['.']);

module.exports = { checkIfFileExists, removeDirectorySync, readFromZipBuffer, createTarball };
