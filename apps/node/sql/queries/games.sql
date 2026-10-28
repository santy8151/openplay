-- name: ListCatalogGames :many
SELECT
    g.id,
    g.name,
    g.author_id,
    a.name AS author_name,
    a.pubkey AS author_pubkey,
    g.license,
    g.latest_version,
    g.tags,
    g.origin_node_url,
    g.verified,
    gv.manifest_json,
    gv.package_url,
    gv.package_sha256,
    gv.package_size,
    gv.signature,
    g.updated_at
FROM games g
JOIN authors a ON a.id = g.author_id
JOIN game_versions gv ON gv.game_id = g.id AND gv.version = g.latest_version
WHERE
    (sqlc.narg('tag')::TEXT IS NULL OR sqlc.narg('tag')::TEXT = ANY(g.tags))
    AND (sqlc.narg('license')::TEXT IS NULL OR g.license = sqlc.narg('license')::TEXT)
    AND (sqlc.narg('query')::TEXT IS NULL OR g.name ILIKE '%' || sqlc.narg('query')::TEXT || '%' OR g.id ILIKE '%' || sqlc.narg('query')::TEXT || '%')
ORDER BY g.updated_at DESC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: GetGameByID :one
SELECT
    g.id,
    g.name,
    g.author_id,
    a.name AS author_name,
    a.pubkey AS author_pubkey,
    g.license,
    g.latest_version,
    g.tags,
    g.origin_node_url,
    g.verified,
    gv.manifest_json,
    gv.package_url,
    gv.package_sha256,
    gv.package_size,
    gv.signature,
    g.updated_at
FROM games g
JOIN authors a ON a.id = g.author_id
JOIN game_versions gv ON gv.game_id = g.id AND gv.version = g.latest_version
WHERE g.id = $1;

-- name: ListGameVersions :many
SELECT
    game_id,
    version,
    manifest_json,
    package_url,
    package_sha256,
    package_size,
    signature,
    created_at
FROM game_versions
WHERE game_id = $1
ORDER BY created_at DESC;

-- name: UpsertAuthor :one
INSERT INTO authors (id, name, pubkey, oidc_subject)
VALUES ($1, $2, $3, $4)
ON CONFLICT (pubkey) DO UPDATE
SET name = EXCLUDED.name
RETURNING id, name, pubkey, oidc_subject, created_at;

-- name: UpsertGame :one
INSERT INTO games (id, name, author_id, license, latest_version, tags, origin_node_url, verified, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    license = EXCLUDED.license,
    latest_version = EXCLUDED.latest_version,
    tags = EXCLUDED.tags,
    verified = EXCLUDED.verified,
    updated_at = NOW()
RETURNING id, name, author_id, license, latest_version, tags, origin_node_url, verified, created_at, updated_at;

-- name: InsertGameVersion :one
INSERT INTO game_versions (game_id, version, manifest_json, package_url, package_sha256, package_size, signature)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING game_id, version, manifest_json, package_url, package_sha256, package_size, signature, created_at;

-- name: ListPeers :many
SELECT url, name, pubkey, etag, last_seen_at, status, consecutive_failures, created_at
FROM peers
ORDER BY url ASC;

-- name: UpsertPeer :one
INSERT INTO peers (url, name, pubkey, etag, last_seen_at, status, consecutive_failures)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (url) DO UPDATE
SET
    name = EXCLUDED.name,
    pubkey = EXCLUDED.pubkey,
    etag = EXCLUDED.etag,
    last_seen_at = EXCLUDED.last_seen_at,
    status = EXCLUDED.status,
    consecutive_failures = EXCLUDED.consecutive_failures
RETURNING url, name, pubkey, etag, last_seen_at, status, consecutive_failures, created_at;

-- name: CreateReport :one
INSERT INTO reports (id, game_id, version, reporter_id, reason, details, status)
VALUES ($1, $2, $3, $4, $5, $6, 'open')
RETURNING id, game_id, version, reporter_id, reason, details, status, created_at;
