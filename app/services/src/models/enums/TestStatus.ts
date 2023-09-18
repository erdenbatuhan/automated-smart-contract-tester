import enumUtils from '@models/enums/common/enumUtils';

enum TestStatus {
  INCONCLUSIVE = 'Inconclusive',
  FAILED = 'Failed',
  PASSED = 'Passed'
}

export const cast = (statusString: string): TestStatus => enumUtils.castStringToEnum(
  statusString,
  Object.values(TestStatus), // All values
  TestStatus.INCONCLUSIVE // Default
);

export default TestStatus;
