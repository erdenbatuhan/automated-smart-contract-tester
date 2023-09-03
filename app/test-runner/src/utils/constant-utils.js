const path = require('path');

module.exports.DOCKER_SOCKET_PATH = process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock';
module.exports.DOCKER_SHARED_TEMP_VOLUME = process.env.DOCKER_SHARED_TEMP_VOLUME;

module.exports.PATH_ROOT = path.dirname(require.main.filename);
module.exports.PATH_TEMP_DIR = process.env.PATH_TEMP_DIR || path.join(this.PATH_ROOT, 'temp');
module.exports.PATH_PROJECT_TEMPLATE = path.join(this.PATH_ROOT, 'templates', 'project');

module.exports.PROJECT_DIR = '/app'; // Must match the WORKDIR in ./templates/project/Dockerfile
module.exports.PROJECT_FOLDERS = { TEST: 'test', SRC: 'src', SOLUTION: 'solution' };
module.exports.PROJECT_FILES = { GAS_SNAPSHOT: '.gas-snapshot' };

module.exports.REQUIRED_FILES = ['remappings.txt', '.gitmodules'];
module.exports.REQUIRED_FOLDERS = [this.PROJECT_FOLDERS.TEST, this.PROJECT_FOLDERS.SOLUTION];

module.exports.DOCKER_IMAGE_SRC = [
  'Dockerfile',
  'foundry.toml', 'install_libraries.sh',
  ...this.REQUIRED_FILES,
  ...this.REQUIRED_FOLDERS
];

module.exports.FORGE_COMMANDS = {
  LIST_TEST_NAMES: 'forge test --list --json',
  RUN_TESTS: 'forge test -vv --allow-failure --json',
  GENERATE_GAS_SNAPSHOT: `forge snapshot --snap ${this.PROJECT_FILES.GAS_SNAPSHOT} --json`,
  COMPARE_SNAPSHOTS: `forge snapshot --diff ${this.PROJECT_FILES.GAS_SNAPSHOT} --allow-failure --json`
};
