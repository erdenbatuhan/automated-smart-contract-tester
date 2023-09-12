import path from 'path';

export default class Constants {
  // Paths
  public static PATH_ROOT = path.dirname(require.main!.filename);
  public static PATH_TEMP_DIR = process.env.PATH_TEMP_DIR || path.join(Constants.PATH_ROOT, 'temp');

  // Tokens and Cookies
  public static MAX_AGE_JWT = 24 * 60 * 60; // 1 day in seconds
  public static MAX_AGE_COOKIE = this.MAX_AGE_JWT * 1000; // Maximum JWT age in milliseconds
}
