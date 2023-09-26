module.exports = {
  apps: [{
    name: 'services',
    script: './dist/index.js',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
