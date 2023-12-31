# Automated Smart Contract Tester - Test Runner

## Running the entire application with Docker Compose

For instructions on running the entire application using _Docker Compose_, please refer to the [README](../README.md) located in the parent directory.

## Running the service separately

### Requirements

- **[Docker](https://www.docker.com)**
- **[RabbitMQ](https://www.rabbitmq.com):** This service relies on message queuing to receive messages from other services. Therefore, it's a must to have RabbitMQ, an open-source message broker, up and running to handle requests from other services. While REST endpoints are also implemented, they should strictly be avoided in production. The intended design is for this service to remain undisclosed, with communication exclusively managed by RabbitMQ. This approach isolates each service within its network and enforces queue limits, ensuring that this service only processes a defined number of requests (messages) at any given time.

To run a RabbitMQ instance, execute the following command:

```bash
make rabbit_start ARGS=-d # Run the RabbitMQ instance in background
```

To remove the RabbitMQ instance:

```bash
make rabbit_stop
```

### Environment Setup

Before running the service, make sure that you have created a `.env.local` file and set the following environment variables.

```bash
APP_NAME=automated-smart-contract-tester
PORT=4001

# Secrets
MONGODB_URI= # Specify your MongoDB URI here

# Docker
DOCKER_SOCKET_PATH=/var/run/docker.sock # The socket that the Host's Docker Daemon runs on

# RabbitMQ
RABBITMQ_HOST=127.0.0.1

# RabbitMQ - Communication Channels
RABBITMQ_EXCHANGE_PROJECT_UPLOAD=exchange_projects_upload
RABBITMQ_EXCHANGE_PROJECT_REMOVAL=exchange_projects_removal
RABBITMQ_QUEUE_SUBMISSION_UPLOAD=queue_submissions_upload

# RabbitMQ - Management Portal
RABBITMQ_MANAGEMENT_PORT=15673
```

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
