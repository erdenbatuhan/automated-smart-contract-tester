export default interface ProjectUploadMessage {
  projectName: string;
  zipBuffer: {
    type: string;
    data: Buffer;
  };
}
