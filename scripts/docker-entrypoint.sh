#!/bin/sh
set -e

if [ "$NODE_ENV" = "production" ]; then
  echo "Running database migrations..."
  node ./node_modules/typeorm/cli.js migration:run -d dist/config/data-source.js
fi

exec node -r tsconfig-paths/register dist/main
