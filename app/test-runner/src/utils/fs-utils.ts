import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import tar from 'tar';

import Logger from '@logging/logger';
import HTTPError from '@errors/http-error';

import constantUtils from './constant-utils';

/**
 * Check if a file exists within a directory.
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
 * Unzip a file to a specified directory.
 *
 * @param {string} tempDirPath - The path to the temporary directory.
 * @param {string} zipFilePath - The path to the zip file to extract.
 * @returns {Promise<void>} A promise that resolves once the unzipping is complete.
 * @throws {HTTPError} If the zip file is empty or does not unzip to a directory.
 */
const unzip = async (tempDirPath: string, zipFilePath: string): Promise<void> => {
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
 * @param {string} dirPath - The path to the directory.
 * @param {{ requiredFiles: string[]; requiredFolders: string[] }} requirements - An object containing requiredFiles and requiredFolders arrays.
 * @returns {Promise<void>} A promise that resolves once the directory contents are checked.
 * @throws {HTTPError} If required files or folders are missing in the directory.
 */
const checkDirectoryContents = async (
  dirPath: string, { requiredFiles, requiredFolders }: { requiredFiles: string[], requiredFolders: string[] }
): Promise<void> => {
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
 * Read data from a zip buffer and write it to a temporary directory.
 *
 * @param {string} contextName - The name of the context for logging purposes.
 * @param {Buffer} zipBuffer - The zip buffer to read from.
 * @param {object|null} [directoryRequirements=null] - An optional object containing requiredFiles and requiredFolders arrays.
 * @param {string[]} [additionalSourcesCopied=[]] - An optional array of additional sources to copy to the temporary directory.
 * @returns {Promise<string>} A promise that resolves to the path of the temporary directory.
 * @throws {HTTPError} If an error occurs while reading or validating the zip buffer.
 */
const readFromZipBuffer = async (
  contextName: string,
  zipBuffer: Buffer,
  directoryRequirements: { requiredFiles: string[], requiredFolders: string[] } | null = null,
  additionalSourcesCopied: string[] = []
): Promise<string> => {
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

    Logger.info(`Read ${contextName} from the zip buffer and wrote it to a temporary directory.`);
    return dirPath;
  } catch (err: HTTPError | Error | unknown) {
    removeDirectorySync(dirPath);

    Logger.error(`An error occurred while reading ${contextName} from the zip buffer and writing it to a temporary directory.`);
    throw new HTTPError((err as HTTPError)?.statusCode || 500, (err as Error)?.message || 'An error occurred.');
  }
};

/**
 * Create a tarball (a readable tar stream) from a specified directory.
 *
 * @param {string} cwd - The current working directory for creating the tarball.
 * @returns {NodeJS.ReadableStream | any} A readable tar stream.
 */
const createTarball = (cwd: string): NodeJS.ReadableStream => tar.create({ gzip: false, cwd }, ['.']); // may need to add { file: '' }

export default { checkIfFileExists, removeDirectorySync, readFromZipBuffer, createTarball };
