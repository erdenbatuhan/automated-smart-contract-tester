module.exports = {
  extends: 'airbnb-base',
  env: {
    es6: true,
    browser: true
  },
  rules: {
    'brace-style': ['error'],
    'comma-dangle': ['error', 'never'],
    'no-unused-vars': ['warn'],
    'max-len': ['error', 120, { ignoreComments: true, ignoreTrailingComments: true, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreRegExpLiterals: true }],
    'no-var': ['off'],
    'one-var': ['off'],
    'object-curly-newline': ['off'],
    'no-prototype-builtins': ['off'],
    'no-control-regex': ['off'],
    'function-paren-newline': ['off'],
    'no-underscore-dangle': ['off'],
    'no-param-reassign': ['off'],
    'no-await-in-loop': ['off'],
    'array-callback-return': ['off'],
    'no-promise-executor-return': ['off'],
    'no-restricted-syntax': ['error', 'ForInStatement']
  }
};
