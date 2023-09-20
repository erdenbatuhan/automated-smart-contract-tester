export default interface ExecutionMessage {
  projectName: string;
  zipBuffer: {
    type: string;
    data: Uint8Array;
  };
  options: {
    containerTimeout?: number;
    execArgs?: object;
  };
}
