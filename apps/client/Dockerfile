FROM node:22-alpine AS builder
WORKDIR /workspace
COPY package.json ./
COPY packages ./packages
COPY apps/client ./apps/client
RUN npm install
RUN npm --workspace @openplay/client run build

FROM caddy:2-alpine
COPY --from=builder /workspace/apps/client/dist /srv
EXPOSE 80
