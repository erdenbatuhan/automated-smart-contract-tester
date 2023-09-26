include .env.local

CONTAINER = $(APP_NAME)-runner
IMAGE = $(CONTAINER):dev

# RabbitMQ
RABBITMQ_CONTAINER = $(APP_NAME)-rabbit
RABBITMQ_VOLUME = $(APP_NAME)-volume-rabbit.data
RABBITMQ_NETWORK = $(APP_NAME)-network-rabbit

.PHONY: remove_container
remove_container:
	docker rm -f $(CONTAINER)

.PHONY: remove_image
remove_image: remove_container
	docker rmi -f $(IMAGE)

.PHONY: build
build: remove_image
	docker build \
		--build-arg PORT=$(PORT) \
		-f docker/Dockerfile.dev \
		-t $(IMAGE) .

.PHONY: run
run: remove_container
	docker run \
		-p $(PORT):$(PORT) \
		-v $(DOCKER_SOCKET_PATH):$(DOCKER_SOCKET_PATH) \
		--network $(RABBITMQ_NETWORK) \
		--name $(CONTAINER) \
		--env-file .env.local --env "RABBITMQ_HOST=$(RABBITMQ_CONTAINER)" \
		$(ARGS) -t $(IMAGE)

.PHONY: stop
stop: remove_container

.PHONY: clean
clean: remove_image

### ---------- ###
###  RabbitMQ  ###
### ---------- ###

.PHONY: rabbit_stop
rabbit_stop:
	docker rm -f $(RABBITMQ_CONTAINER)
	docker volume rm -f $(RABBITMQ_VOLUME)
	docker network rm -f $(RABBITMQ_NETWORK)

.PHONY: rabbit_start
rabbit_start: rabbit_stop
	docker volume create $(RABBITMQ_VOLUME)
	docker network create $(RABBITMQ_NETWORK)
	docker run \
		-p 5672:5672 -p 15672:15672 \
		-v $(RABBITMQ_VOLUME):/var/lib/rabbitmq \
		--network $(RABBITMQ_NETWORK) \
		--name $(RABBITMQ_CONTAINER) \
		$(ARGS) rabbitmq:management

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
