// Read environment variables
const { APP_NAME, TESTRUNNER_SERVICE_NAME, TESTRUNNER_HOST } = process.env;
if (!APP_NAME || !TESTRUNNER_SERVICE_NAME || !TESTRUNNER_HOST) throw new Error('Missing environment variables!');

const TESTRUNNER_BASE = `http://${TESTRUNNER_HOST}/api/${APP_NAME}/${TESTRUNNER_SERVICE_NAME}/v1`;
const TESTRUNNER_URL_PROJECTS = `${TESTRUNNER_BASE}/projects`;
const TESTRUNNER_URL_DOCKER_IMAGES = `${TESTRUNNER_URL_PROJECTS}/images`;

export default {
  TESTRUNNER_CONFIG_PROJECT_UPLOAD: (projectName: string): { url: string; method: string } => ({
    url: `${TESTRUNNER_URL_PROJECTS}/${projectName}/upload`,
    method: 'PUT'
  }),
  TESTRUNNER_CONFIG_PROJECT_REMOVE: (imageName: string): { url: string; method: string } => ({
    url: `${TESTRUNNER_URL_DOCKER_IMAGES}/${imageName}`,
    method: 'DELETE'
  })
};
