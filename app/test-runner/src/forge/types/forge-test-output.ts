import { ForgeOverallGasChange, ForgeGasChange } from '@forge/types/forge-gas-change';
import ForgeTestStatus from '@forge/types/enums/forge-test-status';

export interface ForgeOverallTestResults extends ForgeOverallGasChange {
  numContracts: number;
  numTests: number;
  passed?: boolean;
  numPassed?: number;
  numFailed?: number;
  totalGas?: number | null;
}

export interface ForgeTestResult extends ForgeGasChange {
  contract: string;
  test: string;
  status?: ForgeTestStatus;
  reason?: string;
  logs?: string;
  gas?: number | null;
}

export default interface ForgeTestOutput {
  overall?: ForgeOverallTestResults;
  tests?: ForgeTestResult[];
}
