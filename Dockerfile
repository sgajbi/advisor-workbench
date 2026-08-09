ARG NODE_BASE_IMAGE=node:22.23.1-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3

FROM ${NODE_BASE_IMAGE} AS ci-base
WORKDIR /app

FROM ci-base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM ci-base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json next-env.d.ts next.config.mjs tsconfig.json ./
COPY src ./src
COPY scripts/quality/clean-next-build-artifacts.mjs ./scripts/quality/clean-next-build-artifacts.mjs
COPY scripts/quality/check-portfolio-record-bundles.mjs ./scripts/quality/check-portfolio-record-bundles.mjs
RUN npm run build

FROM ci-base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
COPY --chown=node:node scripts/runtime/workbench-healthcheck.mjs ./healthcheck.mjs
RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg \
    /opt/yarn-v1.22.22
USER node
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=5 CMD ["node", "healthcheck.mjs"]
CMD ["node", "server.js"]
