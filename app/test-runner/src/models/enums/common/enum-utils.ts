/**
 * Converts a string to an enum value if it exists in the provided enum values array,
 * otherwise returns the default value.
 *
 * @template T
 * @param {string | undefined | null} stringValue - The string value to be converted to an enum value.
 * @param {T[]} enumValues - An array containing all the valid enum values.
 * @param {T} defaultValue - The default enum value to be returned if the string is not a valid enum value.
 * @returns {T} The converted enum value if the string is valid; otherwise, the default value.
 */
const castStringToEnum = <T>(stringValue: string | undefined | null, enumValues: T[], defaultValue: T): T => (
  (stringValue && enumValues.includes(stringValue as T)) ? stringValue as T : defaultValue
);

export default { castStringToEnum };
