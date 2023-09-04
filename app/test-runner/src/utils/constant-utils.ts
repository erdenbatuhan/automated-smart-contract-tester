import path from 'path';

const PATH_ROOT = path.dirname(require.main!.filename);

const PROJECT_FOLDERS = {
  TEST: 'test',
  SRC: 'src',
  SOLUTION: 'solution'
};
const PROJECT_FILES = {
  GAS_SNAPSHOT: '.gas-snapshot'
};

const REQUIRED_FILES = ['remappings.txt', '.gitmodules'];
const REQUIRED_FOLDERS = [PROJECT_FOLDERS.TEST, PROJECT_FOLDERS.SOLUTION];

export default {
  DOCKER_SOCKET_PATH: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock',

  PATH_ROOT,
  PATH_TEMP_DIR: process.env.PATH_TEMP_DIR || path.join(PATH_ROOT, 'temp'),
  PATH_PROJECT_TEMPLATE: path.join(PATH_ROOT, 'templates', 'project'),

  PROJECT_DIR: '/app', // Must match the WORKDIR in ./templates/project/Dockerfile
  PROJECT_FOLDERS,
  PROJECT_FILES,

  REQUIRED_FILES,
  REQUIRED_FOLDERS,

  DOCKER_IMAGE_SRC: [
    'Dockerfile',
    'foundry.toml',
    'install_libraries.sh',
    ...REQUIRED_FILES,
    ...REQUIRED_FOLDERS
  ],

  FORGE_COMMANDS: {
    LIST_TEST_NAMES: 'forge test --list --json',
    RUN_TESTS: 'forge test -vv --allow-failure --json',
    GENERATE_GAS_SNAPSHOT: `forge snapshot --snap ${PROJECT_FILES.GAS_SNAPSHOT} --json`,
    COMPARE_SNAPSHOTS: `forge snapshot --diff ${PROJECT_FILES.GAS_SNAPSHOT} --allow-failure --json`
  }
};
