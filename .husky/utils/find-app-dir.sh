#!/usr/bin/env sh

current_dir="$(cd "$(dirname "$0")" && pwd)"
parent_dir="$(dirname "$current_dir")"

# Traverse upward until the root folder with .git is found
while [ ! -d "$parent_dir/.git" ] && [ "$parent_dir" != "/" ]; do
  current_dir="$parent_dir"
  parent_dir="$(dirname "$current_dir")"
done

echo "$current_dir"
