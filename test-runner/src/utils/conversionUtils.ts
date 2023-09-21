/**
 * Converts milliseconds to seconds with two decimal places.
 *
 * @param {number} milliseconds - The value in milliseconds to convert.
 * @returns {number} The converted value in seconds with two decimal places.
 */
const convertMillisecondsToSeconds = (milliseconds: number): number => parseFloat((milliseconds / 1000).toFixed(2));

/**
 * Converts bytes to megabytes (MB) with two decimal places.
 *
 * @param {number} bytes - The value in bytes to convert.
 * @returns {number} The converted value in megabytes (MB) with two decimal places.
 */
const convertBytesToMB = (bytes: number): number => parseFloat((bytes / 1024 / 1024).toFixed(2));

export default { convertMillisecondsToSeconds, convertBytesToMB };
