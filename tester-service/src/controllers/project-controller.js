const fsUtils = require("../utils/fs-utils");
const dockerUtils = require("../utils/docker-utils");

const createNewProject = async (projectName, zipBuffer) => {
  await fsUtils.readProjectFromZipBuffer(projectName, zipBuffer);
  return dockerUtils.createDockerImage(projectName);
};

module.exports = { createNewProject };
