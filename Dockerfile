FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_CASE_MGMT_BASE_URL
ARG VITE_CASE_MGMT_DASHBOARD_PATH
ARG VITE_CASE_MGMT_CITIZEN_LOGIN_URL
ARG VITE_CASE_MGMT_LEGAL_LOGIN_URL
ENV VITE_CASE_MGMT_BASE_URL=$VITE_CASE_MGMT_BASE_URL
ENV VITE_CASE_MGMT_DASHBOARD_PATH=$VITE_CASE_MGMT_DASHBOARD_PATH
ENV VITE_CASE_MGMT_CITIZEN_LOGIN_URL=$VITE_CASE_MGMT_CITIZEN_LOGIN_URL
ENV VITE_CASE_MGMT_LEGAL_LOGIN_URL=$VITE_CASE_MGMT_LEGAL_LOGIN_URL
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/src ./src
COPY backend/public ./public
COPY infra/db ./infra/db
COPY --from=frontend-build /app/frontend/dist ./public

RUN mkdir -p uploads && chown node:node uploads

USER node

EXPOSE 4000

CMD ["node", "src/index.js"]
