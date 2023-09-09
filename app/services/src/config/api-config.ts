// Read environment variables
const { APP_NAME, TESTRUNNER_SERVICE_NAME, TESTRUNNER_HOST } = process.env;
if (!APP_NAME || !TESTRUNNER_SERVICE_NAME || !TESTRUNNER_HOST) throw new Error('Missing environment variables!');

const TESTRUNNER_BASE_URL = `http://${TESTRUNNER_HOST}/api/${APP_NAME}/${TESTRUNNER_SERVICE_NAME}/v1`;
const TESTRUNNER_URL_PROJECTS = `${TESTRUNNER_BASE_URL}/projects`;

export default {
  TESTRUNNER_URL_PROJECT_UPLOAD: (projectName: string) => `${TESTRUNNER_URL_PROJECTS}/${projectName}/upload`
};
