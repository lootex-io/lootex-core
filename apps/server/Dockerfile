ARG NODE_IMAGE_TAG=18-alpine

FROM node:${NODE_IMAGE_TAG} as base

WORKDIR /backend

RUN apk update && apk add \
    git \
    curl \
    python3 \
    make \
    g++ \
    musl-dev \
    libpng \
    libpng-dev \
    jpeg-dev \
    pango-dev \
    cairo-dev \
    giflib-dev
RUN yarn global add pnpm

COPY package.json ./
COPY pnpm-lock.yaml ./

FROM base as pnpm_cache

WORKDIR /backend

# RUN pnpm fetch

FROM pnpm_cache as production_env

RUN pnpm install --prod --no-frozen-lockfile
RUN curl -sf https://gobinaries.com/tj/node-prune | sh && /usr/local/bin/node-prune

FROM pnpm_cache as build_env

WORKDIR /backend
RUN pnpm install --no-frozen-lockfile

FROM build_env as build

WORKDIR /backend

COPY . .

ARG CI=false
ENV CI ${CI}

RUN if [ $CI == true ]; then pnpm lint && pnpm test; fi
RUN pnpm build

FROM base

WORKDIR /backend

COPY --from=build /backend/migrations ./migrations
COPY --from=build /backend/dist ./src
COPY --from=build /backend/campaign ./campaign
COPY --from=production_env /backend/node_modules ./node_modules

ARG BUILD_ID
ENV BUILD_ID=${BUILD_ID:-dev}
ENV NODE_ENV production

CMD ["node", "src/main.js"]
