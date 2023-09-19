# Automated Smart Contract Testing - Backend Services

## Running the entire application with Docker Compose

For instructions on running the entire application using _Docker Compose_, please refer to the [README](../README.md) located in the parent directory.

## Running the service separately

### Requirements

#### 1) Test Runner Service

This service relies on the Test Runner Service, responsible for building Docker images for projects and executing tests within those images. When a project is uploaded or a new submission is received, a request is sent to the Test Runner Service to handle the execution in Docker. Therefore, it's essential that the Test Runner Service is running.

If you haven't already done so, please follow the instructions in the [README](../test-runner/README.md) of the test runner service.

#### 2) RabbitMQ

Communication between this service and the Test Runner Service is established through message queuing using [RabbitMQ](https://www.rabbitmq.com), an open-source message broker. While functionality for sending requests to the Test Runner Service via REST calls is also implemented, it should never be used in production. The intended design is for these services not to be aware of each other's existence, with communication handled exclusively by RabbitMQ. This approach encapsulates each service within its own network and enforces limits on message queues. For example, the Test Runner Service can only process a certain number of requests (messages) at a time.

To run a RabbitMQ instance, execute the following command:

```bash
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:management
```

### Environment Setup

Before running the service, make sure that you have created a **.env.development.local** file and set the following environment variables.

```bash
ENV=dev # The staging environment (dev, qa, prod, etc.)
APP_NAME=automated-smart-contract-testing
SERVICE_NAME=services
PORT=8000

# Secrets
MONGODB_URI= # Specify your MongoDB URI here
JWT_SECRET= # Specify the secret used to sign JWTs

# RabbitMQ
RABBITMQ_HOST=127.0.0.1:5672
```

### Project Execution

#### Option 1: Docker

Build the Docker image using the following command:

```bash
docker build -t automated-smart-contract-testing-services:local .
```

Then, run the Docker image using the following command, ensuring that the port the service will listen on in the Docker container matches the one specified in the **.env.development.local** file:

```bash
docker run -d -p 8000:8000 --env-file .env.development.local automated-smart-contract-testing-services:local
```

#### Option 2: Node Package Manager (npm)

First, install the required packages:

```bash
npm i
```

Then, to run the application, use the following command:

```bash
npm run dev
```
