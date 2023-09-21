export interface ForgeOverallGasChange {
  totalGasChange?: number | null;
  totalGasChangePercentage?: number | null;
}

export interface ForgeGasChange {
  gasChange?: number | null;
  gasChangePercentage?: number | null;
}

export default interface ForgeGasChangeOutput {
  overall: ForgeOverallGasChange;
  tests: { [test: string]: ForgeGasChange };
}
