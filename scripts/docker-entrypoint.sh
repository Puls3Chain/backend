#!/bin/sh
set -e

# NestJS 11 with `sourceRoot: "src"` (see nest-cli.json) emits the compiled
# entry under `dist/src/`, not the flattened `dist/`. Match that layout
# exactly here so a production container can boot.
if [ "$NODE_ENV" = "production" ]; then
  echo "Running database migrations..."
  node ./node_modules/typeorm/cli.js migration:run -d dist/src/config/data-source.js
fi

exec node -r tsconfig-paths/register dist/src/main
