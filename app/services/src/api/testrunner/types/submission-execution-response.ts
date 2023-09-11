export default interface SubmissionExecutionResponse {
  dockerImage: { [key: string]: string | number };
  commandExecuted: string;
  status: string;
  containerName?: string;
  statusCode?: number;
  executionTimeSeconds?: number;
  output?: {
    data?: string;
    error?: string;
    overall?: { passed: boolean; numPassed: number; numFailed: number; totalGas: number; };
    tests?: { [testSuiteName: string]: { [key: string]: string | number }; };
    gasDiffAnalysis?: { [key: string]: string | number };
  };
}
