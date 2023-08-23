const path = require("path");

module.exports.PATH_ROOT = path.dirname(require.main.filename);
module.exports.PATH_PROJECT_TEMPLATE = path.join(this.PATH_ROOT, "templates", "project");
module.exports.PATH_PROJECTS_DIR = path.join(this.PATH_ROOT, "application-storage", "uploads", "projects");

module.exports.PROJECT_FOLDERS = {
  TEST: "test", SRC: "src", SOLUTION: "solution"
}

module.exports.UPLOAD_REQUIREMENT_FILES = [ "remappings.txt", ".gitmodules" ];
module.exports.UPLOAD_REQUIREMENT_FOLDERS = Object.values(this.PROJECT_FOLDERS);

module.exports.DOCKER_IMAGE_SRC = [
  "Dockerfile",
  "foundry.toml", "install_libraries.sh",
  ...this.UPLOAD_REQUIREMENT_FILES,
  ...this.UPLOAD_REQUIREMENT_FOLDERS
];

module.exports.FORGE_COMMANDS = {
  LIST_TEST_NAMES: ["forge", "test", "-l", "-j"],
  RUN_TESTS: ["forge", "test", "-vv"]
}
