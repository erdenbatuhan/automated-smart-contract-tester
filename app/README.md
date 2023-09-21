# Automated Smart Contract Testing

## Contents

- [System Architecture](#system-architecture)
- [Data Model](#data-model)
- [High-level Sequence Diagram](#high-level-sequence-diagram)
- [Setting up the Development Environment](#setting-up-the-development-environment)
- [Running the Entire Application with Docker](#running-the-entire-application-with-docker)
  - [Start Docker Containers](#start-docker-containers)
  - [Stop Docker Containers](#stop-docker-containers)
  - [Clean Up Docker Resources](#clean-up-docker-resources)
  - [Clean Up Data](#clean-up-data)
  - [Prune Docker Resources](#prune-docker-resources)
  - [Prune Docker Resources with Volumes](#prune-docker-resources-with-volumes)
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
# Secrets
SERVICES_MONGODB_URI= # Specify the MongoDB URI of the services app
SERVICES_JWT_SECRET= # Specify the secret used to sign JWTs in services app
```

You can customize certain environment variables defined in **application.properties** by specifying them in the **.env** file. To ensure successful overrides, it's important to import **.env** after **application.properties**, just like the order defined in the **Makefile**.

Here's an example illustrating how you can override variables based on the configuration of the host machine where you're running this:

```bash
ENV=dev # The staging environment (dev, qa, prod, etc.)
PORT=8008 # The port to which the application will be exposed
DOCKER_SOCKET_PATH=/var/run/docker.sock # The socket that the Host's Docker Daemon runs on
```

### Start Docker Containers

To start Docker containers for the application, use the following command:

```bash
make start ARGS=-d # Run the containers in background
```

This command also stops any existing containers related to this application before starting new ones.

### Stop Docker Containers

To stop all Docker containers related to this application, use the following command:

```bash
make stop
```

### Clean Up Docker Resources

To clean up Docker resources, including removing containers, images, and volumes, use the following command:

This command will remove images, containers, volumes (e.g., dangling volumes such as dangling Docker volumes such as _0c18b ... 362cf_), networks, and orphaned containers.

```bash
make clean
```

### Clean Up Data

To clean up the Mongo database and the RabbitMQ data, use the following command:

Please note that this action is irreversible and will result in the removal of all your data!

```bash
make clean_data
```

## (Optional) Running the services separately

Refer to the respective service's README:

- [Test Runner](./test-runner/README.md)
- [Services](./services/README.md)
