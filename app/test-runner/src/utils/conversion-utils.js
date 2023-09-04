/**
 * Converts milliseconds to seconds with two decimal places.
 *
 * @param {Number} milliseconds - The value in milliseconds to convert.
 * @returns {String} A String representing the converted value in seconds with two decimal places.
 */
const convertMillisecondsToSeconds = (milliseconds) => (milliseconds / 1000).toFixed(2);

/**
 * Converts bytes to megabytes (MB) with two decimal places.
 *
 * @param {Number} bytes - The value in bytes to convert.
 * @returns {String} A String representing the converted value in megabytes (MB) with two decimal places.
 */
const convertBytesToMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);

module.exports = { convertMillisecondsToSeconds, convertBytesToMB };
