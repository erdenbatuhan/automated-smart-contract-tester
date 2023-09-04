#!/bin/bash

# Define the paths to the two TypeScript configuration files
base_config="../tsconfig.json"  # Adjust this path to your base configuration file
current_config="tsconfig.json"  # Adjust this path to your current configuration file

# Check if the base configuration file exists
if [ ! -f "$base_config" ]; then
  echo "Base configuration file not found: $base_config"
  exit 1
fi

# Check if the current configuration file exists
if [ ! -f "$current_config" ]; then
  echo "Current configuration file not found: $current_config"
  exit 1
fi

# Extract the compilerOptions section from the base configuration file
base_compiler_options=$(grep -E '^\s*"compilerOptions":\s*{' "$base_config" -A 1000 | sed -n '/^\s*},/q;p')

# Merge the compilerOptions from the base configuration file with the current configuration
merged_config=$(sed "/\"compilerOptions\": {/,/},/ c\
$base_compiler_options
" "$current_config")

# Update the current configuration file with the merged configuration
echo "$merged_config" > "$current_config"

echo "Merged compilerOptions successfully!"
