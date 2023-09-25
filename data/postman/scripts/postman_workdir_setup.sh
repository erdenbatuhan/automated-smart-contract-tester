#!/bin/bash

# This script sets up the Postman working directory.
# It copies contents from the source directory to the destination directory.

# Check if POSTMAN_WORKDIR is set, otherwise use the default directory
if [ -z "$POSTMAN_WORKDIR" ]; then
  POSTMAN_WORKDIR="$HOME/Postman/files"
fi

# Define the source and destination directories
source_dir="$(pwd)/data/postman/workdir"
destination_dir="$POSTMAN_WORKDIR/automated-smart-contract-tester"

# Check if the destination directory exists
if [ ! -d "$destination_dir" ]; then
  # If it doesn't exist, create it
  mkdir -p "$destination_dir"
  echo "Created the Postman working directory: $destination_dir"
fi

# Copy the contents of the source directory to the destination
cp -r "$source_dir"/* "$destination_dir"

# Check if the copy was successful
if [ $? -eq 0 ]; then
  echo "Copied the files to the Postman working directory: $source_dir -> $destination_dir"
else
  echo "Failed to copy the files to the Postman working directory!"
fi
