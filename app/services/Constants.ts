import path from 'path';

export default class Constants {
  // Config
  public static REQUEST_TIMEOUT = 190; // Defined in seconds

  // Paths
  public static PATH_ROOT = path.dirname(require.main!.filename);
  public static PATH_TEMP_DIR = process.env.PATH_TEMP_DIR || path.join(Constants.PATH_ROOT, 'temp');

  // Tokens and Cookies
  public static JWT_NAME = 'token';
  public static MAX_AGE_JWT = 24 * 60 * 60; // 1 day in seconds
  public static MAX_AGE_COOKIE = this.MAX_AGE_JWT * 1000; // Maximum JWT age in milliseconds

  // Project
  public static CONTAINER_TIMEOUT_DEFAULT = 20; // Defined in seconds
  public static PROJECT_DOC_TTL = 5 * 60; // 5 minutes in seconds

  // Submission
  public static SUBMISSION_DOC_TTL = 5 * 60; // 5 minutes in seconds
}
