const path = require("path");

module.exports.PATH_ROOT = path.dirname(require.main.filename);
module.exports.PATH_PROJECT_TEMPLATE = path.join(this.PATH_ROOT, "templates", "project");
module.exports.PATH_PROJECTS_DIR = path.join(this.PATH_ROOT, "application-storage", "uploads", "projects");

module.exports.UPLOAD_REQUIREMENT_FILES = [ "remappings.txt", ".gitmodules" ];
module.exports.UPLOAD_REQUIREMENT_FOLDERS = [ "test", "src", "solution" ];

module.exports.DOCKER_IMAGE_SRC = [
  "Dockerfile",
  "foundry.toml", "install_libraries.sh",
  ...this.UPLOAD_REQUIREMENT_FILES,
  ...this.UPLOAD_REQUIREMENT_FOLDERS
];
