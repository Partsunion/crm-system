# syntax=docker/dockerfile:1.6

FROM node:22.23.2-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --no-progress

COPY . .

ARG VITE_API_BASE_URL=https://api.partsunion.de
ARG VITE_APP_VERSION=crm-system@unversioned
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.30.4-alpine3.24@sha256:adf5042a17f4ecdd200c595fa9ffd1be37efb18f89a830bd1a00e4ab4d59d42c

# Der Digest macht die Basis reproduzierbar; das Upgrade nimmt nachtraeglich
# veroeffentlichte Alpine-Sicherheitskorrekturen mit.
USER root
RUN apk upgrade --no-cache

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown
ARG APP_RELEASE=crm-system@unversioned
ARG VCS_REPOSITORY=https://github.com/Partsunion/crm-system
LABEL org.opencontainers.image.source="$VCS_REPOSITORY" \
      org.opencontainers.image.revision="$VCS_REF" \
      org.opencontainers.image.created="$BUILD_DATE" \
      org.opencontainers.image.version="$APP_RELEASE"

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

ENV PORT=5000
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider "http://127.0.0.1:${PORT}/" || exit 1

USER 101
CMD ["nginx", "-g", "daemon off;"]
