import enumUtils from '@models/enums/common/enum-utils';

enum Status {
  ERROR = 'Error',
  FAILURE = 'Failure',
  SUCCESS = 'Success'
}

export const cast = (statusString?: string): Status => enumUtils.castStringToEnum(
  statusString,
  Object.values(Status), // All values
  Status.ERROR // Default
);

export default Status;
