# Automated Smart Contract Testing - Test Runner

## Running the entire application with Docker Compose

For instructions on running the entire application using _Docker Compose_, please refer to the [README](../README.md) located in the parent directory.

## Running the service separately

### Requirements

#### RabbitMQ

This service relies on message queuing to receive messages from other services. Therefore, it's a must to have [RabbitMQ](https://www.rabbitmq.com), an open-source message broker, up and running to handle requests from other services. While REST endpoints are also implemented, they should strictly be avoided in production. The intended design is for this service to remain undisclosed, with communication exclusively managed by RabbitMQ. This approach isolates each service within its network and enforces queue limits, ensuring that this service only processes a defined number of requests (messages) at any given time.

To run a RabbitMQ instance, execute the following command:

```bash
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:management
```

### Environment Setup

Before running the service, make sure that you have created a **.env.development.local** file and set the following environment variables.

```bash
ENV=dev # The staging environment (dev, qa, prod, etc.)
APP_NAME=automated-smart-contract-testing
SERVICE_NAME=runner
PORT=8001

# Secrets
MONGODB_URI= # Specify your MongoDB URI here

# Docker
DOCKER_SOCKET_PATH=/var/run/docker.sock # The socket that the Host's Docker Daemon runs on

# RabbitMQ
RABBITMQ_HOST=127.0.0.1:5672
```

### Project Execution

#### Option 1: Docker

Build the Docker image using the following command:

```bash
docker build -t automated-smart-contract-testing-runner:local .
```

To run the Docker image, follow these steps:

1. Make sure that the port on which the service will listen inside the Docker container matches the port specified in the **.env.development.local** file.
2. Bind the Docker socket volumes, ensuring that they also match the configuration in the **.env.development.local** file.

Use the following command:

```bash
docker run -d -p 8001:8001 -v /var/run/docker.sock:/var/run/docker.sock --env-file .env.development.local automated-smart-contract-testing-runner:local
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
