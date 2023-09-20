include application.properties

ENV_FILES=\
	--env-file $(MONGO_DIR)/mongo.properties \
	--env-file application.properties \
	--env-file rabbitmq.properties \
	--env-file .env
COMPOSE_FILES=\
	-f $(MONGO_DIR)/docker-compose.mongo.yml \
	-f docker-compose.yml

.PHONY: stop
stop:
	docker-compose -p $(APP_NAME) down

.PHONY: start
start: stop
	docker-compose --project-directory . -p $(APP_NAME) $(ENV_FILES) $(COMPOSE_FILES) up --build $(ARGS)

.PHONY: clean
clean: stop
	docker-compose -p $(APP_NAME) ps -aq | xargs docker rm -f
	docker images -a | awk '/$(APP_NAME)/ { print $$3 }' | xargs docker rmi -f
	docker volume ls -qf dangling=true | egrep '^[a-z0-9]{64}' | xargs docker volume rm

.PHONY: clean_db
clean_db: clean
	docker volume ls --quiet | grep "^$(MONGO_APP_NAME).*\.db" | xargs -I {} docker volume rm {}

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
