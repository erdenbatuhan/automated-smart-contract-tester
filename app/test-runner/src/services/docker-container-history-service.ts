import type { IDockerContainerHistory } from '@models/docker-container-history';

import dockerContainerHistoryRepository from '@repositories/docker-container-history-repository';

/**
 * Saves a Docker Container History.
 *
 * @param {IDockerContainerHistory} dockerContainerHistory - The Docker Container History to save.
 * @returns {Promise<IDockerContainerHistory>} A promise that resolves to the saved Docker Container History.
 */
const saveDockerContainerHistory = (
  dockerContainerHistory: IDockerContainerHistory
): Promise<IDockerContainerHistory> => dockerContainerHistoryRepository.save(dockerContainerHistory);

export default { saveDockerContainerHistory };
