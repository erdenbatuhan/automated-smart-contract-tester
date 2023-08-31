module.exports = {
  extends: 'airbnb-base',
  env: {
    es6: true,
    browser: true
  },
  rules: {
    'brace-style': ['error', 'stroustrup'],
    'comma-dangle': ['error', 'never'],
    'no-unused-vars': ['error'],
    'no-var': ['off'],
    'one-var': ['off']
  }
};
