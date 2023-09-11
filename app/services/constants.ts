import path from 'path';

export default class Constants {
  public static PATH_ROOT = path.dirname(require.main!.filename);
  public static PATH_TEMP_DIR = process.env.PATH_TEMP_DIR || path.join(Constants.PATH_ROOT, 'temp');
}
