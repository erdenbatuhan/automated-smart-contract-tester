import ForgeTestStatus from '@forge/types/enums/forge-test-status';

export default interface ForgeUnprocessedTestResults {
  [contract: string]: {
    duration?: {
      secs: number;
      nanos: number;
    };
    test_results?: {
      [test: string]: {
        status?: ForgeTestStatus;
        reason?: string;
        decoded_logs?: string[];
        kind?: { Standard: number; };
        traces?: string[];
        counterexample?: string;
        labeled_addresses?: object;
        breakpoints?: object;
      };
    };
    warnings?: object;
  };
}
