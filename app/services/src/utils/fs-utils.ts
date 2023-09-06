import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';

import { IFile, IUpload } from '@models/upload';

import Logger from '../logging/logger';
import HTTPError from '../errors/http-error';

import constantUtils from './constant-utils';

/**
 * Extracts the contents of a zip file to a specified directory.
 *
 * @param {string} dirPath - The path to the temporary directory where the zip file will be extracted.
 * @param {string} zipFilePath - The path to the zip file to be extracted.
 * @param {Buffer} zipBuffer - The buffer containing the contents of the zip file.
 * @throws {HTTPError} Throws an HTTP error with status code 400 if the zip file is empty or does not unzip to a directory.
 * @returns {Promise<void>} A promise that resolves once the extraction is complete.
 */
const unzip = async (dirPath: string, zipFilePath: string, zipBuffer: Buffer): Promise<void> => {
  // Create the temporary directory and write zip file in it
  await fs.promises.mkdir(dirPath, { recursive: true });
  await fs.promises.writeFile(zipFilePath, zipBuffer);

  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(dirPath, true); // Extract with overwrite

  // Get the first entry from the zip (assumed to be a directory)
  const firstEntry = zip.getEntries()[0];
  if (!firstEntry || !firstEntry.isDirectory) {
    throw new HTTPError(400, 'The uploaded zip file is either empty or does not unzip to a directory!');
  }

  // Replace the temporary directory with the unzipped directory
  const unzippedDirPath = path.join(dirPath, firstEntry.entryName);
  const swapDirPath = `${dirPath}_swap`;

  await fs.move(unzippedDirPath, swapDirPath); // Unzipped Directory -> Swap Directory
  await fs.remove(dirPath); // Remove: Temporary Directory
  await fs.move(swapDirPath, dirPath); // Swap -> Temporary Directory
};

/**
 * Recursively retrieves a list of uploaded files as strings with their paths.
 *
 * @param {string} dirPath - The path to the directory containing the uploaded files.
 * @param {string} basePath - The base path for constructing file paths.
 * @returns {Promise<IFile[]>} A list of objects with file paths and content as strings.
 */
const getUploadedFilesStringified = async (dirPath: string, basePath: string = ''): Promise<IFile[]> => {
  const contents: IFile[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      contents.push(...await getUploadedFilesStringified(path.join(dirPath, entry.name), entryPath));
    } else if (entry.isFile()) {
      contents.push({
        path: entryPath,
        content: await fs.readFile(path.join(dirPath, entry.name), 'utf8')
      });
    }
  }

  return contents;
};

/**
 * Synchronously removes a directory.
 *
 * @param {string} dirPath - The path to the directory to be removed.
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
 * Reads a zip buffer, extracts its contents to a temporary directory, and returns the uploaded files as strings with their paths.
 *
 * @param {string} contextName - The context name for identifying the temporary directory.
 * @param {Buffer} zipBuffer - The buffer containing the zip file contents.
 * @returns {Promise<IFile[]>} A list of objects with file paths and content as strings.
 * @throws {HTTPError} Throws an HTTP error if an error occurs during the operation.
 */
const getUploadedFilesFromZipBuffer = async (
  contextName: string, zipBuffer: Buffer
): Promise<IFile[]> => {
  const dirPath = path.join(constantUtils.PATH_TEMP_DIR, contextName);
  const zipFilePath = path.join(dirPath, `${contextName}.zip`);

  try {
    // Read from the zip buffer and extract the contents into the temporary directory
    Logger.info(`Reading ${contextName} from the zip buffer and writing it to a temporary directory.`);
    await unzip(dirPath, zipFilePath, zipBuffer);

    // Get the uploaded contents as a list of strings along with their paths
    return await getUploadedFilesStringified(dirPath).then((uploadFiles) => {
      Logger.info(`Read ${contextName} from the zip buffer and wrote it to a temporary directory!`);
      return uploadFiles;
    });
  } catch (err: Error | unknown) {
    Logger.error(`An error occurred while reading ${contextName} from the zip buffer and writing it to a temporary directory!`);
    throw new HTTPError((err as HTTPError)?.statusCode || 500, (err as Error)?.message || 'An error occurred.');
  } finally {
    removeDirectorySync(dirPath);
  }
};

/**
 * Converts a list of uploaded files to a zip buffer.
 *
 * @param {IUpload} uploadDocument - The upload document containing the list of uploaded files.
 * @returns {Buffer} A buffer containing the zipped files.
 * @throws {HTTPError} Throws an HTTP error if an error occurs during the operation.
 */
const writeUploadedFilesToZipBuffer = (uploadDocument: IUpload): Buffer => {
  try {
    Logger.info(`Writing the stringified contents of ${uploadDocument._id} to a zip buffer.`);
    const zip = new AdmZip();

    uploadDocument.files.forEach(({ path: filePath, content: fileContent }) => {
      zip.addFile(filePath, Buffer.from(fileContent, 'utf8'));
    });

    Logger.info(`Successfully wrote the stringified contents of ${uploadDocument._id} to a zip buffer!`);
    return zip.toBuffer();
  } catch (err: Error | unknown) {
    Logger.error(`An error occurred while writing the stringified contents of ${uploadDocument._id} to a zip buffer.`);
    throw new HTTPError(500, (err as Error)?.message || `An error occurred while writing the stringified contents of ${uploadDocument._id} to a zip buffer.`);
  }
};

export default { getUploadedFilesFromZipBuffer, writeUploadedFilesToZipBuffer };
