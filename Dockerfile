FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci
COPY client client
COPY server server
COPY scripts scripts
RUN npm run build

FROM node:20-bookworm-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/src/database/schema.sql server/src/database/schema.sql
COPY --from=build /app/server/migrations server/migrations
EXPOSE 4000
CMD ["npm", "run", "start:online"]
