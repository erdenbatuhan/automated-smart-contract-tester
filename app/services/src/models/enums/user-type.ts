import enumUtils from '@models/enums/common/enum-utils';

enum UserType {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export const cast = (typeString: string): UserType => enumUtils.castStringToEnum(
  typeString,
  Object.values(UserType), // All values
  UserType.USER // Default
);

export const isAdmin = (type: UserType): boolean => type === UserType.ADMIN;

export default UserType;
