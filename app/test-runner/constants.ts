import path from 'path';

export default class Constants {
  // Paths
  public static PATH_ROOT = path.dirname(require.main!.filename);
  public static PATH_TEMP_DIR = process.env.PATH_TEMP_DIR || path.join(Constants.PATH_ROOT, 'temp');
  public static PATH_PROJECT_TEMPLATE = path.join(Constants.PATH_ROOT, 'templates', 'project');

  // Project files & folders
  public static PROJECT_DIR = '/app'; // Must match the WORKDIR in ./templates/project/Dockerfile
  public static PROJECT_FOLDERS = { TEST: 'test', SRC: 'src', SOLUTION: 'solution' };
  public static PROJECT_FILES = { GAS_SNAPSHOT: '.gas-snapshot' };
  public static REQUIRED_FILES = ['remappings.txt', '.gitmodules'];
  public static REQUIRED_FOLDERS = [Constants.PROJECT_FOLDERS.TEST, Constants.PROJECT_FOLDERS.SOLUTION];

  // Docker
  public static DOCKER_SOCKET_PATH = process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock';
  public static DOCKER_IMAGE_SRC = [
    'Dockerfile',
    'foundry.toml',
    'install_libraries.sh',
    ...Constants.REQUIRED_FILES,
    ...Constants.REQUIRED_FOLDERS
  ];

  // Forge
  public static FORGE_COMMANDS = {
    LIST_TEST_NAMES: 'forge test --list --json',
    RUN_TESTS: 'forge test -vv --allow-failure --json',
    GENERATE_GAS_SNAPSHOT: `forge snapshot --snap ${Constants.PROJECT_FILES.GAS_SNAPSHOT} --json`,
    COMPARE_SNAPSHOTS: `forge snapshot --diff ${Constants.PROJECT_FILES.GAS_SNAPSHOT} --allow-failure --json`
  };
}
