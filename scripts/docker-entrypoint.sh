#!/bin/sh
set -e

echo "Starting deployment entrypoint..."

# Run Prisma migrations if connection URL is set
if [ ! -z "$DATABASE_URL" ]; then
  echo "Applying database migrations..."
  npx prisma migrate deploy
else
  echo "DATABASE_URL is not set, skipping database migrations."
fi

echo "Starting application with command: $@"
# Execute the main command
exec "$@"
