# SCPD CMS Overview

## Features
- Auth with JWT; OTP-based forgot/reset via email or SMS
- Role-based access (superadmin, admin, author, department_reviewer, editor, publishing_officer)
- Navigation (menu) management: CRUD, nesting, reorder
- Pages with workflow (draft, department_review, editor_review, publishing_review, published), layout/style fields, multilingual fields (titleOr/summaryOr/bodyOr), hero image, dynamicTableName link, scheduled publish (publishedAt)
- Media library: upload/list/update/delete; categories photo/video/newspaper/audio/carousel; served from /uploads
- Media albums: CRUD, sort order, cover image
- Dynamic CMS tables: create tables with typed columns; update settings (displayName, exposeFrontend, colors); add/drop columns; row CRUD; file uploads; optional public exposure
- User management (admin accounts)
- Audit logs (user/workflow)
- Public delivery: navigation, page by path/slug/lang, media by category, public tables

## Role Matrix
- Superadmin: everything (users, menus, pages, media, albums, CMS tables/columns/rows/settings/uploads, audit logs)
- Admin: same as superadmin except any superadmin-only restrictions enforced in service layer; full CRUD on users, menus, pages, media, albums, CMS tables, audit logs
- Editor: menus, pages (all workflow steps), media, albums; no users; no CMS schema/data; no audit logs
- Publishing_officer: menus, pages (all workflow steps including publish), media, albums; no users; no CMS schema/data; no audit logs
- Department_reviewer: page workflow review/approve; no menus; no media/albums; no users; no CMS schema/data; no audit logs
- Author: create/update pages (early workflow); no menus; no media/albums; no users; no CMS schema/data; no audit logs

### Feature to Role Coverage
- Menu management: superadmin, admin, editor, publishing_officer
- Page CRUD/workflow: superadmin, admin, author, department_reviewer, editor, publishing_officer
- Media library: superadmin, admin, editor, publishing_officer
- Media albums: superadmin, admin, editor, publishing_officer
- CMS tables/schema/data/uploads: superadmin, admin
- User management: superadmin, admin
- Audit logs: superadmin, admin
- Public endpoints: open (subject to exposeFrontend for tables)

## Key Endpoints (admin)
Base: `/api/admin` (JWT bearer)

Auth
- POST /auth/login { email, password }
- POST /auth/login/request-otp { identifier, password, channel?: email|sms }
- POST /auth/login/verify-otp { challengeId, otp }
- POST /auth/forgot-password { email?, phone?, channel?: email|sms }
- POST /auth/reset-password { email, otp, password }

Menus
- GET /menu-items
- POST /menu-items { label, slug, path, parentId?, sortOrder? }
- PATCH /menu-items/:id { label?, slug?, path?, parentId?, sortOrder? }
- PATCH /menu-items/:id/order { parentId?, sortOrder? }
- DELETE /menu-items/:id

Pages (workflow)
- GET /pages?status=
- GET /pages/:menuItemId
- POST /pages { menuItemId, title, status, summary?, body?, titleOr?, summaryOr?, bodyOr?, heroImagePath?, fontFamily?, fontColor?, backgroundColor?, pageLayout?, publishedAt?, dynamicTableName? }

Media
- GET /media
- POST /media (multipart) fields: file, category, altText?, albumId?
- PATCH /media/:id { altText?, category?, albumId? }
- DELETE /media/:id

Media Albums
- GET /media-albums
- POST /media-albums { name, description?, sortOrder?, coverMediaId? }
- PATCH /media-albums/:id { name?, description?, sortOrder?, coverMediaId? }
- DELETE /media-albums/:id

CMS Tables & Data (superadmin/admin)
- POST /cms/tables { tableName, columns: [{ name, type, nullable?, isPrimaryKey?, length?, precision?, scale?, defaultValue? }] }
- GET /cms/tables
- GET /cms/tables/:tableName
- PATCH /cms/tables/:tableName/settings { displayName?, exposeFrontend?, headerBgColor?, headerTextColor?, bodyTextColor? }
- POST /cms/tables/:tableName/columns { column: { name, type, nullable?, isPrimaryKey?, length?, precision?, scale?, defaultValue? } }
- DELETE /cms/tables/:tableName/columns { columnName }
- POST /cms/tables/:tableName/rows { row }
- GET /cms/tables/:tableName/rows?limit=
- PATCH /cms/tables/:tableName/rows { keys, changes }
- DELETE /cms/tables/:tableName/rows { keys }
- POST /cms/uploads (multipart) file

Users (superadmin/admin)
- GET /users
- POST /users { email, password, role?, fullName?, phone?, isActive? }

Audit Logs (superadmin/admin)
- GET /logs?scope=user|workflow&page=&pageSize=

## Key Endpoints (public)
Base: `/api`
- GET /cms/navigation
- GET /cms/pages?path=/about or ?slug=about&lang=or
- GET /cms/media?category=photo|video|newspaper|audio|carousel
- GET /cms/tables/:tableName?limit= (only if exposeFrontend=true)
- GET /news (stub)
- POST /grievances (accepts arbitrary JSON)

## Usage Tips
- Include `Authorization: Bearer <token>` for admin routes.
- Respect role guards; 401/403 indicates missing/expired token or insufficient role.
- After publishing pages or updating menus, invalidate client caches.
- Store returned media fileName/path; serve via `/uploads/<fileName>`.
- For tables, keep `limit` reasonable (<=500); define primary keys for row updates/deletes.
- Colors expect hex like `#1b6dd1`; paths should start with `/`; slugs should be URL-friendly (a-z0-9-).
- For Odisha Govt SMS OTP, configure:
- `GOVT_SMS_API_URL` (optional, defaults to `https://govtsms.odisha.gov.in/api/api.php`)
- `GOVT_SMS_SOURCE`
- `GOVT_SMS_DEPARTMENT_ID`
- `GOVT_SMS_TEMPLATE_ID`
- `GOVT_SMS_OTP_CONTENT` (template text with OTP token; supported: `{#var#}` or `#numeric#`/`#number#`)
- `GOVT_SMS_STRIP_COUNTRY_CODE=true` is recommended when mobile numbers are stored as `91XXXXXXXXXX` but gateway expects local 10-digit recipient numbers.
- If your provider rejects `sendOTPSMS`, set `GOVT_SMS_OTP_ACTION=singleSMS` and keep template/content aligned with the DLT-approved text.
- For temporary troubleshooting, set `GOVT_SMS_OTP_SEND_BOTH_ACTIONS=true` to send OTP via both `sendOTPSMS` and `singleSMS` routes.
- Twilio Verify can still be used as fallback with `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID`.
- In local/dev, SMS OTP will now return an error if no provider is configured. Use `OTP_SMS_DEV_LOG_ONLY=true` only if you intentionally want log-only OTP preview mode.
- For SMS gateway troubleshooting, set `OTP_SMS_GATEWAY_DEBUG_LOG=true` to also log successful provider responses; failures are always logged with full provider response body.

## Azure DB Setup (App Service)
- No schema change is required; startup already runs `ensureBaseCmsSchema()` automatically.
- Configure one of these in App Settings / Connection Strings:
- `DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require`
- `POSTGRES_CONNECTION_STRING=<same value as above>`
- `POSTGRESQLCONNSTR_<name>` (Azure Connection Strings blade)
- If you use separate vars, set: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` and (recommended on Azure) `PGSSLMODE=require`.
