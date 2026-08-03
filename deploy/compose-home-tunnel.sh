#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_dir=$(dirname -- "$script_dir")

cd "$project_dir"

exec docker compose \
    -f docker-compose.yml \
    -f docker-compose.home.yml \
    -f docker-compose.home-tunnel.yml \
    "$@"
