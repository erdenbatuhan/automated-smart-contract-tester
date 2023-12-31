import path from 'path';

export default class Constants {
  // REST Config
  public static REQUEST_TIMEOUT = 180; // Defined in seconds

  // Paths
  public static PATH_ROOT = path.dirname(require.main!.filename);
  public static PATH_TEMP_DIR = process.env.PATH_TEMP_DIR || path.join(Constants.PATH_ROOT, 'temp');
  public static PATH_PROJECT_TEMPLATE = path.join(Constants.PATH_ROOT, 'templates', 'project');

  // Project Files & Folders
  public static PROJECT_DIR = '/app'; // Must match the WORKDIR in ./templates/project/Dockerfile
  public static PROJECT_FILES = {
    DOCKERFILE: 'Dockerfile',
    FOUNDRY_CONFIG: 'foundry.toml',
    REMAPPINGS: 'remappings.txt',
    GIT_MODULES: '.gitmodules',
    LIBRARY_INSTALLATION_SCRIPT: 'install_libraries.sh',
    GAS_SNAPSHOT: '.gas-snapshot'
  };
  public static PROJECT_FOLDERS = { TEST: 'test', SRC: 'src', SOLUTION: 'solution' };
  public static PROJECT_UPLOAD_REQUIREMENTS_FILES = [Constants.PROJECT_FILES.REMAPPINGS, Constants.PROJECT_FILES.GIT_MODULES];
  public static PROJECT_UPLOAD_REQUIREMENTS_FOLDERS = [Constants.PROJECT_FOLDERS.TEST, Constants.PROJECT_FOLDERS.SRC];
  public static PROJECT_DOCKER_IMAGE_SRC = [
    Constants.PROJECT_FILES.DOCKERFILE,
    Constants.PROJECT_FILES.FOUNDRY_CONFIG,
    Constants.PROJECT_FILES.LIBRARY_INSTALLATION_SCRIPT,
    ...Constants.PROJECT_UPLOAD_REQUIREMENTS_FILES,
    ...Constants.PROJECT_UPLOAD_REQUIREMENTS_FOLDERS
  ];

  // Docker
  public static DOCKER_SOCKET_PATH = process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock';
  public static DOCKER_CONTAINER_TIMEOUT_DEFAULT = 30; // Defined in seconds

  // Forge & Forge-related Constants
  public static CMD_RETRIEVE_SNAPSHOTS = `cat ${Constants.PROJECT_FILES.GAS_SNAPSHOT}`;
  public static FORGE_TEST_ARGUMENTS = '--silent -vv --allow-failure --json';
  public static FORGE_CMD_RUN_TESTS = `forge test ${Constants.FORGE_TEST_ARGUMENTS}`;
  public static FORGE_CMD_LIST_TEST_NAMES = `forge test ${Constants.FORGE_TEST_ARGUMENTS} --list`;
  public static FORGE_CMD_GENERATE_SNAPSHOTS = `forge snapshot ${Constants.FORGE_TEST_ARGUMENTS} --snap ${Constants.PROJECT_FILES.GAS_SNAPSHOT}`;
  public static FORGE_CMD_COMPARE_SNAPSHOTS = `forge snapshot ${Constants.FORGE_TEST_ARGUMENTS} --diff ${Constants.PROJECT_FILES.GAS_SNAPSHOT}`;
}
