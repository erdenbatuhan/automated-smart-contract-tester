enum TestStatus {
  INCONCLUSIVE = 'INCONCLUSIVE',
  FAILED = 'FAILED',
  PASSED = 'PASSED'
}

/**
 * Casts a string to the TestStatus enum or returns a default value if the string is not a valid enum value.
 *
 * @param {string} statusString - The string to cast to the TestStatus enum.
 * @returns {TestStatus} The TestStatus enum value corresponding to the input string, or TestStatus.ERROR as the default value if not valid.
 */
export const castToTestStatus = (statusString: string): TestStatus => (
  (Object.values(TestStatus).includes(statusString as TestStatus))
    ? statusString as TestStatus // Convert if valid
    : TestStatus.INCONCLUSIVE // Default value
);

export default TestStatus;
