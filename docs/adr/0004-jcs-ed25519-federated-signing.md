# ADR 0004: Firma Federada mediante RFC 8785 (JCS) y Ed25519

- **Estado:** Aceptado
- **Fecha:** 2026-10-27

## Contexto

En una arquitectura federada donde un paquete publicado en el Nodo A (`Neo-Bogota Node 01`) puede ser replicado e indexado por el Nodo B (`Tokyo Grid Peer 02`) y finalmente ejecutado offline en la PWA de un jugador, la seguridad no puede depender únicamente de TLS entre el navegador y el último nodo consultado.

Si se firmara el archivo JSON en texto crudo tal cual fue formateado, cualquier re-serialización JSON en Go (`encoding/json`), PostgreSQL (`JSONB`) o TypeScript (`JSON.stringify`) alteraría espacios en blanco o el orden de las propiedades, invalidando la firma criptográfica.

## Decisión

1. **Canonización Determinista con RFC 8785 (JSON Canonicalization Scheme — JCS):**
   Antes de firmar o verificar cualquier `manifest.json` o `/v1/index.json`, se elimina la propiedad de nivel superior `"signature"` y se serializa el árbol JSON siguiendo estrictamente el RFC 8785 (propiedades de objetos ordenadas lexicográficamente por unidades de código UTF-16, sin espacios en blanco superfluos y formato numérico canónico IEEE 754).
2. **Digest y Algoritmo de Firma:**
   Se calcula `digest = sha256(JCS(documento_sin_signature))` (32 bytes) y se firma/verifica con **Ed25519** (`RFC 8032`), codificando la clave pública como `ed25519:<base64>` y la firma como `<base64>`.

## Consecuencias

- **Interoperabilidad total entre Go, PostgreSQL JSONB y WebCrypto/TypeScript:** Los manifiestos pueden almacenarse en columnas `JSONB` de Postgres y re-serializarse sin romper jamás la firma original del autor.
- **Verificación rápida en cliente y servidor:** Ed25519 ofrece claves públicas de solo 32 bytes, firmas de 64 bytes y verificación en sub-milisegundos tanto en Go (`crypto/ed25519`) como en navegadores modernos (`SubtleCrypto` / verificador puro).
