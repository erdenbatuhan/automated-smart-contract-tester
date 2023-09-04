const DockerContainerHistory = require('../models/docker-container-history');

/**
 * Creates a new DockerContainerHistory document.
 *
 * @param {DockerImage} dockerImage - The DockerImage associated with the container history.
 * @param {Object} dockerContainerExecutionInfo - Information about the executed Docker container.
 * @returns {DockerContainerHistory} The newly created DockerContainerHistory document.
 */
const create = (dockerImage, dockerContainerExecutionInfo) => new DockerContainerHistory({
  dockerImage, ...dockerContainerExecutionInfo
});

/**
 * Saves a DockerContainerHistory document.
 *
 * @param {DockerContainerHistory} dockerContainerHistory - The DockerContainerHistory document to save.
 * @param {mongoose.ClientSession} session - The Mongoose client session.
 * @returns {Promise<DockerContainerHistory>} A promise that resolves to the saved DockerContainerHistory document.
 */
const save = (dockerContainerHistory, session) => dockerContainerHistory.save({ session });

module.exports = { create, save };
