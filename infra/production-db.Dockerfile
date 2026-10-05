FROM postgres:16-alpine

COPY infra/production-db-init/ /docker-entrypoint-initdb.d/
COPY infra/db/init.sql /opt/scpd-bootstrap/web-schema.sql
COPY infra/db/003_add_function_menu_and_page.sql /opt/scpd-bootstrap/web-function-menu.sql
COPY db/init/03-public-users.sql /opt/scpd-bootstrap/public-users.sql
