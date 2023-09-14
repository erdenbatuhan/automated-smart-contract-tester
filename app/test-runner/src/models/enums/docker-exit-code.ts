enum DockerExitCode {
  PURPOSELY_STOPPED = 0, // Purposely stopped - Developer-initiated stop
  APPLICATION_ERROR = 1, // Application error - App error or incorrect reference
  FAILED_TO_RUN = 125, // Container failed to run error - Failed to run
  COMMAND_INVOKE_ERROR = 126, // Command invoke error - Command invocation error
  FILE_OR_DIR_NOT_FOUND = 127, // File or directory not found - File/dir not found
  INVALID_ARGUMENT_EXIT = 128, // Invalid argument used on exit - Invalid argument
  ABNORMAL_TERMINATION = 134, // Abnormal termination (SIGABRT) - Abnormal termination
  IMMEDIATE_TERMINATION = 137, // Immediate termination (SIGKILL) - Immediate termination
  SEGMENTATION_FAULT = 139, // Segmentation fault (SIGSEGV) - Segmentation fault
  GRACEFUL_TERMINATION = 143, // Graceful termination (SIGTERM) - Graceful termination
  EXIT_STATUS_OUT_OF_RANGE = 255 // Exit status out of range - Exit Status Out Of Range
}

export default DockerExitCode;
