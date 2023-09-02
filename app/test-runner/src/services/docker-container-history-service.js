const DockerContainerHistory = require('../models/docker-container-history');

const create = (dockerImage, dockerContainerExecutionInfo) => new DockerContainerHistory({
  dockerImage, ...dockerContainerExecutionInfo
});

const save = (dockerContainerHistory, session) => dockerContainerHistory.save({ session });

module.exports = { create, save };
