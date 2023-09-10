module.exports = {
  env: {
    es6: true,
    node: true,
    browser: true
  },
  plugins: ['import'],
  extends: ['eslint:recommended', 'plugin:import/recommended', 'airbnb-base'],
  ignorePatterns: ['node_modules', 'dist'],
  rules: {
    'max-len': ['error', 130, { ignoreComments: true, ignoreTrailingComments: true, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreRegExpLiterals: true }],
    'brace-style': ['error'],
    'no-unused-vars': ['warn'],
    'comma-dangle': ['error', 'never'],
    'no-var': ['off'],
    'one-var': ['off'],
    'one-var-declaration-per-line': ['off'],
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
  },
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        // tsconfigRootDir: __dirname,
        project: 'tsconfig.json'
      },
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended', 'plugin:import/typescript', 'airbnb-typescript/base'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn'],
        '@typescript-eslint/comma-dangle': ['error', 'never'],
        '@typescript-eslint/return-await': ['off'],
        '@typescript-eslint/lines-between-class-members': ['off'],
        'import/extensions': ['off'],
        'import/order': ['off']
      }
    }
  ]
};
