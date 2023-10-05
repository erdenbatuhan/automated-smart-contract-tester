include application.properties

ENV_FILES = \
	--env-file $(MONGO_DIR)/mongo.properties \
	--env-file ./application.properties \
	--env-file ./rabbitmq.properties \
	$(if $(wildcard .env), --env-file .env)
COMPOSE_FILES = \
	-f $(MONGO_DIR)/docker-compose.mongo.yml \
	-f ./docker/prod/docker-compose.prod.yml

.PHONY: stop
stop:
	docker compose -p $(APP_NAME) down || true

.PHONY: start
start: stop
	docker compose --project-directory . -p $(APP_NAME) $(ENV_FILES) $(COMPOSE_FILES) up --build $(ARGS)

.PHONY: clean_dangling_volumes
clean_dangling_volumes: stop
	docker volume ls -qf "dangling=true" | egrep '^[a-z0-9]{64}' | xargs docker volume rm -f || true

.PHONY: clean
clean: clean_dangling_volumes
	docker compose -p $(APP_NAME) ps -aq | xargs docker rm -f || true
	docker network ls -qf "label=com.docker.compose.project=$(APP_NAME)" | xargs docker network rm -f || true
	docker images -qf "label=com.docker.compose.project=$(APP_NAME)" | xargs docker rmi -f

.PHONY: clean_data
clean_data: clean_dangling_volumes
	docker volume ls -qf "label=com.docker.compose.project=$(APP_NAME)" | xargs docker volume rm -f || true

### ----------------------------------------------------------------------- ###
###  Caution: Use the following commands carefully!                         ###
###  This warning emphasizes the need for caution when using the commands.  ###
### ----------------------------------------------------------------------- ###

.PHONY: prune
prune: stop
	docker system prune

.PHONY: prune_with_volumes
prune_with_volumes: stop
	docker system prune -a --volumes
