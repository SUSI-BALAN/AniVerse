FROM node:22-bookworm-slim AS build
WORKDIR /app
# better-sqlite3 falls back to node-gyp when a prebuilt binary is unavailable.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci
COPY client client
COPY server server
COPY scripts scripts
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/src/database/schema.sql server/src/database/schema.sql
COPY --from=build /app/server/migrations server/migrations
EXPOSE 4000
CMD ["npm", "run", "start:online"]
