import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';

import Logger from '@logging/logger';
import AppError from '@errors/app-error';

import { IFile, IUpload } from '@models/upload';

import constantUtils from '@utils/constant-utils';
import errorUtils from '@/utils/error-utils';

/**
 * Extracts the contents of a zip file to a specified directory.
 *
 * @param {string} dirPath - The path to the temporary directory where the zip file will be extracted.
 * @param {string} zipFilePath - The path to the zip file to be extracted.
 * @param {Buffer} zipBuffer - The buffer containing the contents of the zip file.
 * @throws {AppError} HTTP Error with status code 400 if the zip file is empty or does not unzip to a directory.
 * @returns {Promise<string>} A promise that resolves to the path of the directory where the contents were extracted.
 */
const unzip = async (dirPath: string, zipFilePath: string, zipBuffer: Buffer): Promise<string> => {
  // Create the temporary directory and write zip file in it
  await fs.promises.mkdir(dirPath, { recursive: true });
  await fs.promises.writeFile(zipFilePath, zipBuffer);

  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(dirPath, true); // Extract with overwrite

  const firstEntry = zip.getEntries()[0]; // First entry is the first file/directory extracted
  let extractedDirPath = dirPath;

  // If it is a directory, update the extracted path; otherwise, it stays the same
  if (!firstEntry || !firstEntry.entryName) {
    throw new AppError(400, 'The uploaded zip file is probably empty!');
  } else if (firstEntry.isDirectory) {
    extractedDirPath = path.join(dirPath, firstEntry.entryName);
  }

  // Remove the zip file and return the new temporary directory path, if changed
  fs.removeSync(zipFilePath);
  return extractedDirPath;
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
 * @throws {AppError} HTTP Error if an error occurs during the operation.
 */
const getUploadedFilesFromZipBuffer = async (
  contextName: string, zipBuffer: Buffer
): Promise<IFile[]> => {
  const dirPath = path.join(constantUtils.PATH_TEMP_DIR, contextName);
  const zipFilePath = path.join(dirPath, `${contextName}.zip`);

  try {
    // Read from the zip buffer and extract the contents into the temporary directory
    Logger.info(`Reading ${contextName} from the zip buffer and writing it to a temporary directory.`);
    const extractedPath = await unzip(dirPath, zipFilePath, zipBuffer);

    // Get the uploaded contents as a list of strings along with their paths
    return await getUploadedFilesStringified(extractedPath).then((uploadFiles) => {
      Logger.info(`Read ${contextName} from the zip buffer and wrote it to a temporary directory!`);
      return uploadFiles;
    });
  } catch (err: AppError | Error | unknown) {
    throw errorUtils.logAndGetError(new AppError(
      (err as AppError)?.statusCode || 500,
      `An error occurred while reading ${contextName} from the zip buffer and writing it to a temporary directory!`,
      (err as AppError)?.reason || (err as Error)?.message)
    );
  } finally {
    removeDirectorySync(dirPath);
  }
};

/**
 * Converts a list of uploaded files to a zip buffer.
 *
 * @param {IUpload} uploadDocument - The Upload document containing the list of uploaded files.
 * @returns {Buffer} A buffer containing the zipped files.
 * @throws {Error} Error if an error occurs during the operation.
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
    throw err;
  }
};

export default { getUploadedFilesFromZipBuffer, writeUploadedFilesToZipBuffer };
