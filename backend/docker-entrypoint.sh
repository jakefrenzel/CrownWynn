#!/bin/sh
set -e

# Simple entrypoint for Docker: wait for DB, run migrations, collectstatic, then gunicorn
# Wait for Postgres to become available (simple loop)
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL is set, attempting to wait for DB..."
  # Extract host and port using python (robust parsing)
  DB_HOST=$(python - <<PY
from urllib.parse import urlparse
import os
u=os.environ.get('DATABASE_URL')
if u:
    p=urlparse(u)
    host=p.hostname or 'localhost'
    port=p.port or 5432
    print(host)
PY
)
  DB_PORT=$(python - <<PY
from urllib.parse import urlparse
import os
u=os.environ.get('DATABASE_URL')
if u:
    p=urlparse(u)
    port=p.port or 5432
    print(port)
PY
)
  echo "Waiting for $DB_HOST:$DB_PORT..."
  RET=1
  while [ $RET -ne 0 ]; do
    nc -z $DB_HOST $DB_PORT >/dev/null 2>&1 || true
    RET=$?
    if [ $RET -ne 0 ]; then
      echo "DB not ready yet... sleeping 1s"
      sleep 1
    fi
  done
  echo "DB is up"
fi

# Run migrations and collectstatic
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Start gunicorn
exec gunicorn crownwynn.wsgi:application --bind 0.0.0.0:8000 --workers 3
