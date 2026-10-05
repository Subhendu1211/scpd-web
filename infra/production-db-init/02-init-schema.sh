#!/bin/sh
set -eu

psql --username "$APP_DB_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 \
	--file=/opt/scpd-bootstrap/web-schema.sql \
	--file=/opt/scpd-bootstrap/web-function-menu.sql \
	--file=/opt/scpd-bootstrap/public-users.sql
