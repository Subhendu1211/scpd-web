#!/bin/sh
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
	--set=ON_ERROR_STOP=1 \
	--set=app_user="$APP_DB_USER" \
	--set=app_password="$APP_DB_PASSWORD" \
	--set=case_user="$CASE_DB_USER" \
	--set=case_password="$CASE_DB_PASSWORD" \
	--set=app_database="$POSTGRES_DB" <<'SQL'
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_password';
CREATE ROLE :"case_user" LOGIN PASSWORD :'case_password';
REVOKE CONNECT ON DATABASE :"app_database" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"app_database" TO :"app_user", :"case_user";
ALTER SCHEMA public OWNER TO :"app_user";
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO :"app_user";
CREATE SCHEMA case_management AUTHORIZATION :"case_user";
SQL
