// Read environment variables
const { APP_NAME } = process.env;
if (!APP_NAME) throw new Error('Missing environment variables!');

export default {
  APP_NAME
};
