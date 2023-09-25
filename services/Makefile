include .env.development.local

CONTAINER = $(APP_NAME)-services
IMAGE = $(CONTAINER):local

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
		--build-arg ENV=$(ENV) --build-arg PORT=$(PORT) \
		-t $(IMAGE) .

.PHONY: run
run: remove_container
	docker run \
		-p $(PORT):$(PORT) \
		--network $(RABBITMQ_NETWORK) \
		--name $(CONTAINER) \
		--env-file .env.development.local --env "RABBITMQ_HOST=$(RABBITMQ_CONTAINER)" \
		$(ARGS) -t $(IMAGE)

.PHONY: clean
clean: remove_image

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