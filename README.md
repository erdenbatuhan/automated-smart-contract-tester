# Automated Smart Contract Tester

## Contents

- [High-level Sequence Diagram](#high-level-sequence-diagram)
- [System Architecture](#system-architecture)
- [Data Model](#data-model)
- [Running the Entire Application with Docker](#running-the-entire-application-with-docker)
  - [Secrets](#secrets)
  - [Start Docker Containers](#start-docker-containers)
  - [Stop Docker Containers](#stop-docker-containers)
  - [Clean Up Docker Resources](#clean-up-docker-resources)
  - [Clean Up Data](#clean-up-data)
  - [(Optional) Overriding Application Properties](#optional-overriding-application-properties)
- [Setting up the Postman Workspace](#setting-up-the-postman-workspace)
- [Development](#development)
  - [Setting up the Development Environment](#setting-up-the-development-environment)
  - [Running the services separately](#running-the-services-separately)

## High-level Sequence Diagram

![high-level-sequence-diagram](data/img/Smart%20Contract%20Testing%20Service%20%7C%20High-level%20Sequence%20Diagram%20%7C%20Exercise%20Upload%20&%20Code%20Submission.png)

## System Architecture

![system-architecture](data/img/Smart%20Contract%20Testing%20Service%20%7C%20System%20Architecture.png)

## Data Model

![data-model](data/img/Smart%20Contract%20Testing%20Service%20%7C%20Data%20Model.png)

## Running the Entire Application with Docker

### Secrets

Create the following files and place the respective secrets in them:

- `./services/secrets/jwt.secret`
- `./services/secrets/mongodb-uri.secret`

**Exclusion in Docker:** It's important to note that the secrets directory won't be copied into the Docker container. Docker handles the logistics of secrets securely. This exclusion is specified in the `.dockerignore` file located in the `./services` directory.

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

### (Optional) Overriding Application Properties

You can customize certain environment variables defined in `application.properties` by creating a `.env` file based on the configuration of the host machine where you're running this application. To ensure successful overrides, it's important to import `.env` after `application.properties` (This is already how it is set up in the `Makefile`). Here's an example:

```bash
# .env
ENV=dev # The staging environment (dev, qa, prod, etc.).
PORT=14000 # The port to which the application will be exposed.
DOCKER_SOCKET_PATH=/var/run/docker.sock # The socket that the Host's Docker Daemon runs on.
```

## Setting up the Postman Workspace

The directory `./data/postman` contains the Postman collections for the services, along with example inputs used in these requests. To set up a Postman workspace on your local machine, follow these steps:

1. **Install Postman:** If you haven't already, [install Postman](https://www.postman.com/downloads/) on your computer.
2. **Configure Working Directory:** Ensure that the default [working directory](https://learning.postman.com/docs/getting-started/installation/settings/#working-directory) in Postman remains set to `~/Postman/files`. This setting is important for the workspace setup.
3. **Initialize Postman Workspace:** Run the [./data/postman/scripts/postman_workdir_setup.sh](data/postman/scripts/postman_workdir_setup.sh) script in the root directory of the project (The same directory with this [README.md](./README.md)). This script will create the necessary Postman working directory for this application and transfer the data used in the requests into the working directory.
4. **(Optional) Create Workspace:** If desired, create a new Postman workspace named (e.g. _Automated Smart Contract Tester_). Workspaces help organize your collections.
5. **Import Collections:** [Import the Postman collections](https://learning.postman.com/docs/getting-started/importing-and-exporting/importing-data/) located in [./data/postman/collections](./data/postman/collections) into your Postman workspace.

Remember to:

- Update these collections if you create new endpoints or make changes during your development process. This ensures that other developers who might work on this project later have access to the up-to-date endpoints.
- Add new or updated files needed in the requests both under your Postman working directory for this application (`~/Postman/files/automated-smart-contract-tester`) and to `./data/postman/files`.

## Development

### Setting up the Development Environment

Enhance project code quality using packages like _ESLint_ and _Prettier_. To set everything up correctly, install the dependencies in this directory with the following command:

```bash
npm i
```

_Husky's pre-commit hooks_ and _lint-staged_ ensure that _ESLint_ and _Prettier_ run before each commit to enforce code quality rules defined in [.eslintrc.js](./.eslintrc.js). You can find the list of files linted by these pre-commit hooks in [package.json](./package.json).

**Bonus:** To get real-time linting warnings and errors, install _ESLint_ in your preferred IDE.

### Running the services separately

For individual service setup and development, please consult the README for each service:

- [Test Runner](./test-runner/README.md)
- [Services](./services/README.md)
