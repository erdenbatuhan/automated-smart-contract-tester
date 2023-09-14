# Automated Smart Contract Testing - Test Runner

## Running the entire application with Docker

For instructions on running the entire application using _Docker_, please refer to the [README](../README.md) located in the parent directory.

## Running the service separately

Before running the service, make sure that you have created a **.env.development.local** file and set the following environment variables.

```bash
# Application Config
APP_NAME=automated-smart-contract-testing

# Service Configuration
SERVICE_NAME=runner
PORT=4001
MONGO_DB_URI= # Specify your MongoDB URI here
```

First, install the required packages:

```bash
npm i
```

Then, to run the application, use the following command:

```bash
npm run dev
```
