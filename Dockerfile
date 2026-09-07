FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/engine/package.json packages/engine/
COPY packages/shared/package.json packages/shared/
RUN npm ci
COPY . .
RUN npm run db:generate && npm run build

FROM build AS api
ENV NODE_ENV=production
USER node
EXPOSE 3001
CMD ["npm","run","start","-w","apps/api"]

FROM nginx:stable-alpine AS web
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
