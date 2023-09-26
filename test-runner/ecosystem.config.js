module.exports = {
  apps: [{
    name: 'test-runner',
    script: './dist/index.js',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
