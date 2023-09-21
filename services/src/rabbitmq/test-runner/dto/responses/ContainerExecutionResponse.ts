import type { ITest } from '@models/schemas/TestSchema';

import ContainerExecutionStatus from '@rabbitmq/test-runner/dto/responses/enums/ContainerExecutionStatus';

interface ContainerTestResult extends ITest {
  status?: string;
  reason?: string;
  logs?: string;
  gas?: number | null;
  gasChange?: number | null;
  gasChangePercentage?: number | null;
}

export default interface ContainerExecutionResponse {
  dockerImage: {
    imageID: string;
    imageName: string;
    imageBuildTimeSeconds: number;
    imageSizeMB: number;
  };
  status: ContainerExecutionStatus;
  purpose: number;
  container?: {
    containerName?: string;
    cmd: string;
    timeoutValue: number;
    executionTimeSeconds?: number;
    statusCode?: number;
    output?: {
      data?: string;
      error?: string;
      overall?: {
        numContracts: number;
        numTests: number;
        passed?: boolean;
        numPassed?: number;
        numFailed?: number;
        totalGas?: number | null;
        totalGasChange?: number | null;
        totalGasChangePercentage?: number | null;
      };
      tests?: ContainerTestResult[];
    }
  };
}
