include .env.development.local

CONTAINER=$(APP_NAME)-$(SERVICE_NAME)
IMAGE=$(CONTAINER):local
BUILD_ARGS=\
	--build-arg ENV=$(ENV) \
	--build-arg PORT=$(PORT)
ENV_FILE=--env-file .env.development.local

.PHONY: remove_container
remove_container:
	docker rm -f $(CONTAINER)

.PHONY: remove_image
remove_image: remove_container
	docker rmi -f $(IMAGE)

.PHONY: build
build: remove_image
	docker build $(BUILD_ARGS) -t $(IMAGE) .

.PHONY: run
run: remove_container
	docker run $(ARGS) -t -p $(PORT):$(PORT) -v $(DOCKER_SOCKET_PATH):$(DOCKER_SOCKET_PATH) $(ENV_FILE) --name $(CONTAINER) $(IMAGE)

.PHONY: clean
clean: remove_image

### ---------- ###
###  RabbitMQ  ###
### ---------- ###

.PHONY: rabbit_clean
rabbit_clean:
	docker rm -f rabbitmq

.PHONY: rabbit_run
rabbit_run: rabbit_clean
	docker run $(ARGS) -p ${RABBITMQ_PORT}:5672 -p ${RABBITMQ_MANAGEMENT_PORT}:15672 --name rabbitmq rabbitmq:management

### ----------------------------------------------------------------------- ###
###  Caution: Use the following commands carefully!                         ###
###  This warning emphasizes the need for caution when using the commands.  ###
### ----------------------------------------------------------------------- ###

.PHONY: prune
prune:
	docker system prune

.PHONY: prune_with_volumes
prune_with_volumes:
	docker system prune -a --volumes
