import apiConfig from '@api/common/config/api-config';

// Read environment variables
const { TESTRUNNER_SERVICE_NAME, TESTRUNNER_HOST } = process.env;
if (!TESTRUNNER_SERVICE_NAME || !TESTRUNNER_HOST) throw new Error('Missing environment variables!');

const TESTRUNNER_BASE = `http://${TESTRUNNER_HOST}/api/${apiConfig.APP_NAME}/${TESTRUNNER_SERVICE_NAME}/v1`;
const TESTRUNNER_URL_PROJECTS = `${TESTRUNNER_BASE}/projects`;

export default {
  /**
   * @url /projects
   */
  TESTRUNNER_CONFIG_PROJECT_UPLOAD: (projectName: string): { url: string; method: string } => ({
    url: `${TESTRUNNER_URL_PROJECTS}/${projectName}/upload`,
    method: 'PUT'
  }),
  /**
   * @url /projects/images
   */
  TESTRUNNER_CONFIG_PROJECT_REMOVE: (imageName: string): { url: string; method: string } => ({
    url: `${TESTRUNNER_URL_PROJECTS}/images/${imageName}`,
    method: 'DELETE'
  }),
  /**
   * @url /projects/{projectName}/executions
   */
  TESTRUNNER_CONFIG_TEST_EXECUTION: (projectName: string): { url: string; method: string } => ({
    url: `${TESTRUNNER_URL_PROJECTS}/${projectName}/executions`,
    method: 'PUT'
  })
};
