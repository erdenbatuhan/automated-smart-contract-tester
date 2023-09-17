// Read environment variables
const { APP_NAME, TESTRUNNER_SERVICE_NAME, TESTRUNNER_HOST } = process.env;
if (!APP_NAME || !TESTRUNNER_SERVICE_NAME || !TESTRUNNER_HOST) throw new Error('Missing environment variables!');

// Test Runner
export class TestRunnerApiEndpointConfig {
  public static BASE = `http://${TESTRUNNER_HOST}/api/${APP_NAME}/${TESTRUNNER_SERVICE_NAME}/v1`;
  public static URL_PROJECTS = `${TestRunnerApiEndpointConfig.BASE}/projects`;
  /**
   * @url /projects
   */
  public static CONFIG_PROJECT_UPLOAD = (projectName: string): { url: string; method: string } => ({
    url: `${TestRunnerApiEndpointConfig.URL_PROJECTS}/${projectName}/upload`,
    method: 'PUT'
  });
  /**
   * @url /projects/images
   */
  public static CONFIG_PROJECT_REMOVE = (imageName: string): { url: string; method: string } => ({
    url: `${TestRunnerApiEndpointConfig.URL_PROJECTS}/images/${imageName}`,
    method: 'DELETE'
  });
  /**
   * @url /projects/{projectName}/executions
   */
  public static CONFIG_TEST_EXECUTION = (projectName: string): { url: string; method: string } => ({
    url: `${TestRunnerApiEndpointConfig.URL_PROJECTS}/${projectName}/executions`,
    method: 'POST'
  });
}

// Other APIs
// ...

export default {};
