import enumUtils from '@models/enums/common/enum-utils';

enum TestStatus {
  INCONCLUSIVE = 'INCONCLUSIVE',
  FAILED = 'FAILED',
  PASSED = 'PASSED'
}

export const cast = (statusString: string): TestStatus => enumUtils.castStringToEnum(
  statusString,
  Object.values(TestStatus), // All values
  TestStatus.INCONCLUSIVE // Default
);

export default TestStatus;
