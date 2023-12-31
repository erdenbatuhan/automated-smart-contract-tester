# Automated Smart Contract Tester - Services

## Running the entire application with Docker Compose

For instructions on running the entire application using _Docker Compose_, please refer to the [README](../README.md) located in the parent directory.

## Running the service separately

### Requirements

- **[Docker](https://www.docker.com)**
- **[Test Runner Service](../test-runner):** This service relies on the Test Runner Service, responsible for building Docker images for projects and executing tests within those images. When a project is uploaded or a new submission is received, a request is sent to the Test Runner Service to handle the execution in Docker. Therefore, it's essential that the Test Runner Service is running.
- **[RabbitMQ](https://www.rabbitmq.com):** Communication between this service and the Test Runner Service is established through message queuing using RabbitMQ, an open-source message broker. While functionality for sending requests to the Test Runner Service via REST calls is also implemented, it should never be used in production. The intended design is for these services not to be aware of each other's existence, with communication handled exclusively by RabbitMQ. This approach encapsulates each service within its own network and enforces limits on message queues. For example, the Test Runner Service can only process a certain number of requests (messages) at a time.

If you haven't already done so, please follow the instructions in the [README](../test-runner/README.md) of the test runner service to set up and run both the test runner service and RabbitMQ.

### Environment Setup

Before running the service, make sure that you have created a `.env.local` file and set the following environment variables.

```bash
APP_NAME=automated-smart-contract-tester
PORT=4000

# Secrets
SECRETS_DIR=./secrets/local
SECRETS_EXT=.local.secret

# RabbitMQ
RABBITMQ_HOST=127.0.0.1

# RabbitMQ - Communication Channels
RABBITMQ_EXCHANGE_PROJECT_UPLOAD=exchange_projects_upload
RABBITMQ_EXCHANGE_PROJECT_REMOVAL=exchange_projects_removal
RABBITMQ_QUEUE_SUBMISSION_UPLOAD=queue_submissions_upload

# RabbitMQ - Management Portal Credentials
RABBITMQ_MANAGEMENT_USERNAME=guest
RABBITMQ_MANAGEMENT_PASSWORD=guest
```

### Secrets

Create the following files and place the respective secrets in them:

- `./secrets/local/jwt.local.secret`
- `./secrets/local/mongodb-uri.local.secret`

Ensure that each secret is securely stored in its respective file.

### Option 1 - Using Docker

#### Building the Docker image:

```bash
make build
```

#### Starting the Docker container:

```bash
make run ARGS=-d # Run the containers in background
```

#### Stopping the Docker container:

```bash
make stop
```

#### Cleaning up Docker resources, including removing the container and the image:

```bash
make clean
```

### Option 2 - Using Node Package Manager (npm)

First, install the required packages:

```bash
npm i
```

Then, to run the application, use the following command:

```bash
npm run dev
```
