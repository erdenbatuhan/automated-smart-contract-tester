import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import tar from 'tar';
import { HttpStatusCode } from 'axios';

import Constants from '~Constants';
import Logger from '@logging/Logger';
import AppError from '@errors/AppError';

import errorUtils from './errorUtils';

/**
 * Checks if a file exists within a directory.
 *
 * @param {string} dirPath - The directory path.
 * @param {string} filename - The name of the file to check.
 * @throws {Error} If the file does not exist in the directory.
 */
const checkIfFileExists = (dirPath: string, filename: string): void => {
  if (!fs.existsSync(path.join(dirPath, filename))) {
    throw new Error(`${filename} not found in ${dirPath}.`);
  }
};

/**
 * Unzips a file to a specified directory.
 *
 * @param {string} dirPath - The path to the temporary directory where the zip file will be extracted.
 * @param {string} zipFilePath - The path to the zip file to be extracted.
 * @param {Buffer} zipBuffer - The buffer containing the contents of the zip file.
 * @param {string[]} [requiredFolders=[]] - An optional array of folder names that must exist in the zip file.
 * @throws {AppError} HTTP Error with status code 400 if the zip file is empty or does not unzip to a directory.
 * @returns {Promise<string>} A promise that resolves to the path of the directory where the contents were extracted.
 */
const unzip = async (
  dirPath: string, zipFilePath: string, zipBuffer: Buffer, requiredFolders: string[] = []
): Promise<string> => {
  // Create the temporary directory and write zip file in it
  await fs.promises.mkdir(dirPath, { recursive: true });
  await fs.promises.writeFile(zipFilePath, zipBuffer);

  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(dirPath, true); // Extract with overwrite

  const firstEntry = zip.getEntries()[0]; // First entry is the first file/directory extracted
  let extractedDirPath = dirPath;

  // If it is a directory, update the extracted path; otherwise, it stays the same
  if (!firstEntry || !firstEntry.entryName) {
    throw new AppError(HttpStatusCode.BadRequest, 'The uploaded zip file is probably empty!');
  } else if (firstEntry.isDirectory && !requiredFolders.includes(firstEntry.entryName)) {
    extractedDirPath = path.join(dirPath, firstEntry.entryName);
  }

  // Remove the zip file and return the new temporary directory path, if changed
  fs.removeSync(zipFilePath);
  return extractedDirPath;
};

/**
 * Checks the contents of a directory against required files and folders.
 *
 * @param {string} dirPath - The path to the directory.
 * @param {{ requiredFiles: string[]; requiredFolders: string[] }} requirements - An object containing requiredFiles and requiredFolders arrays.
 * @returns {Promise<void>} A promise that resolves once the directory contents are checked.
 * @throws {AppError} If required files or folders are missing in the directory.
 */
const checkDirectoryContents = async (
  dirPath: string, { requiredFiles, requiredFolders }: { requiredFiles: string[]; requiredFolders: string[]; }
): Promise<void> => {
  const files = await fs.promises.readdir(dirPath);
  const directories = await fs.promises.readdir(dirPath, { withFileTypes: true })
    .then((entries) => entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));

  const missingFiles = requiredFiles.filter((file) => !files.includes(file));
  const missingDirectories = requiredFolders.filter((directory) => !directories.includes(directory));

  // If there are missing files or directories, remove the extracted directory and throw an error
  if (missingFiles.length > 0 || missingDirectories.length > 0) {
    throw new AppError(HttpStatusCode.BadRequest, `Missing required files: ${missingFiles.join(', ')}, Missing required directories: ${missingDirectories.join(', ')}.`);
  }
};

/**
 * Removes a directory synchronously.
 *
 * @param {string} dirPath - The path to the directory to remove.
 */
const removeDirectorySync = (dirPath: string): void => {
  try {
    Logger.info(`Removing the directory (${dirPath}).`);
    fs.removeSync(dirPath);
    Logger.info(`Removed the directory (${dirPath})!`);
  } catch (err: Error | unknown) {
    Logger.warn(`Could not remove the directory (${dirPath}). (Error: ${(err as Error)?.message})`);
  }
};

/**
 * Reads data from a zip buffer and write it to a temporary directory.
 *
 * @param {string} contextName - The name of the context for logging purposes.
 * @param {Buffer} zipBuffer - The zip buffer to read from.
 * @param {object|null} [directoryRequirements=null] - An optional object containing requiredFiles and requiredFolders arrays.
 * @param {string[]} [additionalSourcesCopied=[]] - An optional array of additional sources to copy to the temporary directory.
 * @returns {Promise<{ dirPath: string; extractedPath: string }>} A promise that resolves to the temporary directory paths.
 * @throws {AppError} If an error occurs while reading or validating the zip buffer.
 */
const readFromZipBuffer = async (
  contextName: string,
  zipBuffer: Buffer,
  directoryRequirements: { requiredFiles: string[]; requiredFolders: string[] } | null = null,
  additionalSourcesCopied: string[] = []
): Promise<{ dirPath: string; extractedPath: string }> => {
  const dirPath = path.join(Constants.PATH_TEMP_DIR, contextName);
  const zipFilePath = path.join(dirPath, `${contextName}.zip`);

  try {
    // Read from the zip buffer and extract the contents into the temporary directory
    Logger.info(`Reading ${contextName} from the zip buffer and writing it to a temporary directory.`);
    const extractedPath = await unzip(dirPath, zipFilePath, zipBuffer, directoryRequirements?.requiredFolders);

    // Check if the uploaded contents match the required contents
    if (directoryRequirements) {
      await checkDirectoryContents(extractedPath, directoryRequirements);
    }

    // Copy additional files if there are any to the temporary directory (overwrites!)
    if (additionalSourcesCopied && Array.isArray(additionalSourcesCopied)) {
      for (const src of additionalSourcesCopied) {
        await fs.copy(src, extractedPath, { overwrite: true });
      }
    }

    Logger.info(`Read ${contextName} from the zip buffer and wrote it to a temporary directory.`);
    return { dirPath, extractedPath };
  } catch (err: AppError | Error | unknown) {
    // Remove the temporary directory before throwing the errors
    removeDirectorySync(dirPath);

    // Throw error
    throw errorUtils.handleError(err, `An error occurred while reading ${contextName} from the zip buffer and writing it to a temporary directory.`);
  }
};

/**
 * Creates a tarball (a readable tar stream) from a specified directory.
 *
 * @param {string} cwd - The current working directory for creating the tarball.
 * @returns {NodeJS.ReadableStream | any} A readable tar stream.
 */
const createTarball = (cwd: string): NodeJS.ReadableStream => tar.create({ gzip: false, cwd }, ['.']); // may need to add { file: '' }

export default { checkIfFileExists, removeDirectorySync, readFromZipBuffer, createTarball };
