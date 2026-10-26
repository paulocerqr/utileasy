#!/bin/sh
set -eu
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$(dirname -- "$script_dir")"
exec docker compose -p utilitydev \
  -f docker-compose.yml \
  -f docker-compose.home-tunnel.yml \
  -f docker-compose.oracle.yml "$@"
