const path = require("path");

module.exports.PATH_ROOT = path.dirname(require.main.filename);
module.exports.PATH_PROJECT_TEMPLATE = path.join(this.PATH_ROOT, "project-template");
module.exports.PATH_PROJECTS_DIR = path.join(this.PATH_ROOT, "projects");

module.exports.UPLOAD_REQUIREMENT_FILES = [ "remappings.txt", ".gitmodules" ];
module.exports.UPLOAD_REQUIREMENT_FOLDERS = [ "test", "src", "solution" ];

module.exports.DOCKER_IMAGE_SRC = [ "Dockerfile", "foundry.toml", "remappings.txt", ".gitmodules", "install_libraries.sh", "test", "src" ];
module.exports.DOCKER_STREAM_REGEX_IMAGE_ID = /Successfully built ([a-f0-9]+)/;
module.exports.DOCKER_STREAM_REGEX_STEP = /^Step \d+\/\d+ : .+$/;
