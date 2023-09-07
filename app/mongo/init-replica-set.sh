#!/bin/bash

# Function to wait for MongoDB replicas to become available
wait_for_mongodb_replicas() {
  REPLICA_HOSTS=("$MONGO_REPL_1" "$MONGO_REPL_2" "$MONGO_REPL_3")

  for HOST in "${REPLICA_HOSTS[@]}"; do
    until mongosh --host "$APP_NAME-$HOST" --eval "print(\"Waiting for connection to $APP_NAME-$HOST...\")" >/dev/null 2>&1
    do
      sleep 1
    done
  done
}

# Sleep for 2 seconds before moving forward
echo "Starting replica set initialization"
sleep 2

# Wait for MongoDB replicas to spawn
echo "Waiting for connection to all replicas"
wait_for_mongodb_replicas
echo "Connection to all replicas established"

# MongoDB initialization script using heredoc (<<EOF)
echo "Creating replica set ($MONGO_REPL_ID)"
mongosh --host "$APP_NAME-$MONGO_REPL_1" <<EOF
const hosts = [
  '$APP_NAME-$MONGO_REPL_1:$MONGO_PORT',
  '$APP_NAME-$MONGO_REPL_2:$MONGO_PORT',
  '$APP_NAME-$MONGO_REPL_3:$MONGO_PORT'
];
const config = {
  _id: '$MONGO_REPL_ID',
  members: hosts.map((host, idx) => ({ _id: idx, host }))
};

printjson('Replicas', config); // Print the configuration object (optional)
rs.initiate(config);
EOF
echo "Replica set ($MONGO_REPL_ID) created"
