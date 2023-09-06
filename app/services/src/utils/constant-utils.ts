import path from 'path';

const PATH_ROOT = path.dirname(require.main!.filename);

export default {
  PATH_ROOT,
  PATH_TEMP_DIR: process.env.PATH_TEMP_DIR || path.join(PATH_ROOT, 'temp')
};
