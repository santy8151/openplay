# Guía de Operador: Cómo levantar tu propio nodo federado OpenPlay

Cualquier comunidad, universidad o colectivo de desarrolladores puede levantar su propio nodo federado de **OpenPlay** en menos de 5 minutos usando Docker Compose.

---

## 1. Arquitectura de un Nodo

Un despliegue completo de nodo OpenPlay en `deploy/docker-compose.yml` incluye:
- **`node-a` (`apps/node`)**: Servidor Go 1.23 con API REST (`/v1/*`), firma de índice federado (`/v1/index.json`) y señalización WebSocket (`/v1/signal`).
- **`postgres:16-alpine`**: Almacenamiento relacional de catálogo, versiones, pares federados y reportes (`001_init.sql`).
- **`redis:7-alpine`**: Coordinación efímera y caché de sesiones/salas.
- **`coturn/coturn`**: Servidor STUN/TURN con autenticación efímera REST HMAC-SHA1 y bloqueo de rangos IP privados (anti-SSRF).
- **`caddy:2.8-alpine`**: Proxy inverso con cabeceras de seguridad estrictas y aislamiento de origen para `games.<domain>`.

---

## 2. Despliegue Rápido con Docker Compose

Desde la raíz del monorepo:

```bash
docker compose -f deploy/docker-compose.yml up --build -d
```

Verifica que el nodo principal y el nodo par federado respondan correctamente:

```bash
curl -s http://localhost:8080/v1/healthz
curl -s http://localhost:8080/v1/index.json
curl -s http://localhost:8080/v1/federation/peers
```

---

## 3. Variables de Entorno del Nodo (`apps/node`)

| Variable | Valor por Defecto | Descripción |
| :--- | :--- | :--- |
| `OPENPLAY_ADDR` | `:8080` | Puerto de escucha HTTP y WebSocket. |
| `OPENPLAY_NODE_NAME` | `Neo-Bogota Node 01` | Nombre legible del nodo publicado en `/v1/index.json`. |
| `OPENPLAY_NODE_URL` | `http://localhost:8080` | URL pública canónica del nodo. |
| `OPENPLAY_NODE_PRIVKEY` | *(Derivada determinísticamente en dev)* | Semilla privada Ed25519 en Base64 (32 bytes) para firmar `/v1/index.json`. **Obligatorio usar una semilla aleatoria secreta en producción.** |
| `OPENPLAY_TURN_SECRET` | `openplay-coturn-dev-hmac-secret` | Secreto compartido con `coturn` (`static-auth-secret` en `deploy/coturn.conf`). |
| `OPENPLAY_TURN_URIS` | `turn:localhost:3478?transport=udp,...` | Lista separada por comas de URIs STUN/TURN entregadas a los clientes WebRTC. |
| `OPENPLAY_PEERS` | *(Vacío)* | Lista separada por comas de URLs de nodos pares federados a indexar (ej. `https://tokyo-grid.openplay.example`). |

---

## 4. Generación de Llaves Ed25519 y Secreto TURN para Producción

Genera una semilla Ed25519 de 32 bytes y un secreto HMAC para TURN usando OpenSSL:

```bash
export OPENPLAY_NODE_PRIVKEY="$(openssl rand -base64 32)"
export OPENPLAY_TURN_SECRET="$(openssl rand -hex 32)"
```

Actualiza `static-auth-secret` en `deploy/coturn.conf` con el mismo valor de `OPENPLAY_TURN_SECRET`.

---

## 5. Monitoreo y Moderación

- **Métricas Prometheus:** Disponibles en `GET /v1/metrics` (`openplay_http_requests_total`, `openplay_catalog_games_total`, `openplay_active_rooms_total`, `openplay_federation_peers_total`, `openplay_abuse_reports_total`).
- **Reportes de Abuso o Licencia:** Los jugadores pueden reportar paquetes desde la UI (`POST /v1/reports`), quedando registrados para revisión del operador del nodo.
