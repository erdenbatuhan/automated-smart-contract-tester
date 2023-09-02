const path = require('path');

module.exports.DEFAULT_DOCKER_SOCKET_PATH = '/var/run/docker.sock';

module.exports.PATH_ROOT = path.dirname(require.main.filename);
module.exports.PATH_PROJECT_TEMPLATE = path.join(this.PATH_ROOT, 'templates', 'project');

module.exports.PROJECT_FOLDERS = {
  TEST: 'test', /* SRC: "src", */ SOLUTION: 'solution'
};

module.exports.PROJECT_FILES = {
  GAS_SNAPSHOT: '.gas-snapshot'
};

module.exports.REQUIRED_FILES = ['remappings.txt', '.gitmodules'];
module.exports.REQUIRED_FOLDERS = Object.values(this.PROJECT_FOLDERS);

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
