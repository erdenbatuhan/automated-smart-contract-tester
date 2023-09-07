# Automated Smart Contract Testing

Docker Compose commands:

Build:

```bash
docker-compose --env-file mongo/mongo.properties --env-file application.properties --env-file .env \
               -f mongo/docker-compose.mongo.yml -f docker-compose.yml build
```

Run:

```bash
docker-compose --env-file mongo/mongo.properties --env-file application.properties --env-file .env \
               -f mongo/docker-compose.mongo.yml -f docker-compose.yml up
```
