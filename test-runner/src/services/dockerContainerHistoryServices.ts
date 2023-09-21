import type { SessionOption } from 'mongoose';

import type { IDockerContainerHistory } from '@models/DockerContainerHistory';

/**
 * Saves a Docker Container History.
 *
 * @param {IDockerContainerHistory} dockerContainerHistory - The Docker Container History to save.
 * @param {SessionOption} [sessionOption] - An optional MongoDB session for the upload.
 * @returns {Promise<IDockerContainerHistory>} A promise that resolves to the saved Docker Container History.
 */
const saveDockerContainerHistory = (
  dockerContainerHistory: IDockerContainerHistory, sessionOption?: SessionOption
): Promise<IDockerContainerHistory> => dockerContainerHistory.save(sessionOption);

export default { saveDockerContainerHistory };
