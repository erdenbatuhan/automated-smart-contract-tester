# Automated Smart Contract Testing - Backend Services

## Running the entire application with Docker

For instructions on running the entire application using _Docker_, please refer to the [README](../README.md) located in the parent directory.

## Running the service separately

If you have not already done so, first follow the instructions in the [README](../test-runner/README.md) of the test runner service.

Before running the service, make sure that you have created a **.env.development.local** file and set the following environment variables.

```bash
ENV=dev # The staging environment (dev, qa, prod, etc.)
APP_NAME=automated-smart-contract-testing
SERVICE_NAME=services
PORT=8000

# Secrets
MONGODB_URI= # Specify your MongoDB URI here
JWT_SECRET= # Specify the secret used to sign JWTs

# Test Runner
TESTRUNNER_SERVICE_NAME=runner
TESTRUNNER_HOST=localhost:8001
```

First, install the required packages:

```bash
npm i
```

Then, to run the application, use the following command:

```bash
npm run dev
```
