import type { ClientSession } from 'mongoose';

import type { IDockerContainerHistory } from '@models/docker-container-history';

/**
 * Saves a DockerContainerHistory document.
 *
 * @param {IDockerContainerHistory} dockerContainerHistory - The DockerContainerHistory document to save.
 * @param {ClientSession | null} [session=null] - The Mongoose client session.
 * @returns {Promise<IDockerContainerHistory>} A promise that resolves to the saved DockerContainerHistory document.
 */
const save = (
  dockerContainerHistory: IDockerContainerHistory, session: ClientSession | null = null
): Promise<IDockerContainerHistory> => dockerContainerHistory.save({ session });

export default { save };
