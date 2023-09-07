## Automated Smart Contract Testing - Backend Services

### Running the entire application with Docker

For instructions on running the entire application using _Docker_, please refer to the [README](../README.md) located in the parent directory.

### Running the service separately

If you have not already done so, first follow the instructions in the [README](../test-runner/README.md) of the test runner service.

Before running the service, make sure that you have created the **.env.development.local** file and set the following environment variables.

```bash
# Application Config
APP_NAME=automated-smart-contract-testing

# Service Configuration
SERVICE_NAME=services
PORT=4000
MONGO_DB_URI= # Specify your MongoDB URI here

# Service Configuration: Test Runner
TESTRUNNER_HOST=localhost:4001
```

First, install the required packages:

```bash
npm i
```

Then, to run the application, use the following command:

```bash
npm run dev
```
