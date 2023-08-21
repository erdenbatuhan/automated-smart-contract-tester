#!/bin/bash

# Extract libraries from .gitmodules and install them
while IFS= read -r line; do
  if [[ $line =~ ^[[:space:]]*url[[:space:]]*=[[:space:]]*https:\/\/github\.com\/([^/]+)\/([^/]+) ]]; then
    # Extract the library name
    library=${BASH_REMATCH[1]}/${BASH_REMATCH[2]}

    # Install the library
    echo "Installing $library"
    forge install "$library" --no-commit
  fi
done < .gitmodules
