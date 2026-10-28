-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS authors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pubkey TEXT NOT NULL UNIQUE,
    oidc_subject TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
    license TEXT NOT NULL,
    latest_version TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    origin_node_url TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_versions (
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    manifest_json JSONB NOT NULL,
    package_url TEXT NOT NULL,
    package_sha256 TEXT NOT NULL,
    package_size BIGINT NOT NULL CHECK (package_size > 0 AND package_size <= 20971520),
    signature TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (game_id, version)
);

CREATE TABLE IF NOT EXISTS peers (
    url TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pubkey TEXT NOT NULL,
    etag TEXT NOT NULL DEFAULT '',
    last_seen_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending',
    consecutive_failures INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    version TEXT NOT NULL DEFAULT '',
    reporter_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_tags ON games USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_games_license ON games (license);
CREATE INDEX IF NOT EXISTS idx_reports_game_id ON reports (game_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS peers;
DROP TABLE IF EXISTS game_versions;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS authors;
-- +goose StatementEnd
