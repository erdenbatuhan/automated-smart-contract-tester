import type { ClientSession } from 'mongoose';

import type { IDockerContainerHistory } from '@models/docker-container-history';

/**
 * Saves a Docker Container History.
 *
 * @param {IDockerContainerHistory} dockerContainerHistory - The Docker Container History to save.
 * @param {ClientSession | null} [session=null] - The Mongoose client session.
 * @returns {Promise<IDockerContainerHistory>} A promise that resolves to the saved Docker Container History.
 */
const saveDockerContainerHistory = (
  dockerContainerHistory: IDockerContainerHistory, session: ClientSession | null = null
): Promise<IDockerContainerHistory> => dockerContainerHistory.save({ session });

export default { saveDockerContainerHistory };
