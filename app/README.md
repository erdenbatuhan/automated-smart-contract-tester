# Automated Smart Contract Testing

## Contents

- [System Architecture](#system-architecture)
- [Data Model](#data-model)
- [High-level Sequence Diagram](#high-level-sequence-diagram)
- [Setting up the Development Environment](#setting-up-the-development-environment)
- [Running the Entire Application with Docker](#running-the-entire-application-with-docker)
  - [Useful Docker Commands](#useful-docker-commands)
- [(Optional) Running the services separately](#optional-running-the-services-separately)

## System Architecture

![system-architecture](../img/Smart%20Contract%20Testing%20Service%20%7C%20System%20Architecture.png)

## Data Model

![data-model](../img/Smart%20Contract%20Testing%20Service%20%7C%20Data%20Model.png)

## High-level Sequence Diagram

![high-level-sequence-diagram](../img/Smart%20Contract%20Testing%20Service%20%7C%20High-level%20Sequence%20Diagram%20%7C%20Exercise%20Upload%20&%20Code%20Submission.png)

## Setting up the Development Environment

Enhance project code quality using packages like _ESLint_ and _Prettier_. To set everything up correctly, install the dependencies in this directory with the following command:

```bash
npm i
```

_Husky's pre-commit hooks_ and _lint-staged_ ensure that _ESLint_ and _Prettier_ run before each commit to enforce code quality rules defined in [.eslintrc.js](./.eslintrc.js). You can find the list of files linted by these pre-commit hooks in [package.json](./package.json).

**Bonus:** To get real-time linting warnings and errors, install _ESLint_ in your preferred IDE.

## Running the Entire Application with Docker

Before running the application, create a **.env** file and set the following environment variables:

```bash
# Application Config
STAGING=dev # The staging environment (dev, qa, prod, etc.)

# Service Secrets: Services
SERVICES_JWT_SECRET= # Specify the secret used to sign JWTs in services app

# Docker
DOCKER_SOCKET_PATH=/var/run/docker.sock # The socket that the Host's Docker Daemon runs on
```

To run the application with _Docker Compose_, use the following commands:

#### Building or rebuilding service(s):

```bash
docker-compose \
    --env-file mongo/mongo.properties --env-file application.properties --env-file .env \
    -f mongo/docker-compose.mongo.yml -f docker-compose.yml build
```

#### Creating and starting container(s):

```bash
docker-compose \
    --env-file mongo/mongo.properties --env-file application.properties --env-file .env \
    -f mongo/docker-compose.mongo.yml -f docker-compose.yml up
```

#### Stopping and removing container(s), network(s):

```bash
docker-compose \
    --env-file mongo/mongo.properties --env-file application.properties --env-file .env \
    -f mongo/docker-compose.mongo.yml -f docker-compose.yml down
```

### Useful Docker Commands

#### Deleting all container(s):

```bash
docker rm -f $(docker ps -a -q)
```

#### Deleting all volume(s):

_!!! Be careful as it will remove all the data previously stored in the DB. If you wish to keep the data, skip this step. !!!_

```bash
docker volume rm $(docker volume ls -q)
```

## (Optional) Running the services separately

Refer to the respective service's README:

- [Test Runner](./test-runner/README.md)
- [Services](./services/README.md)
- [Web](./web/README.md)
