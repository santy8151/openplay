# syntax=docker/dockerfile:1
FROM golang:1.23-alpine AS builder

WORKDIR /src
RUN apk add --no-cache ca-certificates git

COPY go.mod ./
COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/openplay-node ./cmd/node

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 openplay
USER openplay
WORKDIR /app
COPY --from=builder /out/openplay-node /app/openplay-node
COPY openapi.yaml /app/openapi.yaml
COPY sql /app/sql

EXPOSE 8080
ENTRYPOINT ["/app/openplay-node"]
