import enumUtils from '@models/enums/common/enum-utils';

enum UserRole {
  USER = 'User',
  ADMIN = 'Admin'
}

export const cast = (typeString: string): UserRole => enumUtils.castStringToEnum(
  typeString,
  Object.values(UserRole), // All values
  UserRole.USER // Default
);

export const isAdmin = (type: UserRole): boolean => type === UserRole.ADMIN;

export default UserRole;
