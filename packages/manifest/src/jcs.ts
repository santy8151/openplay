/**
 * RFC 8785 — JSON Canonicalization Scheme (JCS)
 * Deterministically serializes JSON values so TypeScript and Go produce byte-for-byte
 * identical UTF-8 payloads prior to SHA-256 hashing and Ed25519 signing.
 */

export function canonicalizeJcs(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  if (type === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (type === 'number') {
    const num = value as number;
    if (!Number.isFinite(num)) {
      throw new Error('JCS error: non-finite numbers (NaN or Infinity) are not permitted in JSON');
    }
    if (Object.is(num, -0)) {
      return '0';
    }
    return JSON.stringify(num);
  }

  if (type === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const elements = value.map((item) => {
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol') {
        return 'null';
      }
      return canonicalizeJcs(item);
    });
    return `[${elements.join(',')}]`;
  }

  if (type === 'object') {
    const record = value as Record<string, unknown>;
    // RFC 8785 Section 3.2.3: Sort object properties lexicographically by UTF-16 code units.
    // Standard JS Array.prototype.sort() compares strings by UTF-16 code units.
    const keys = Object.keys(record)
      .filter((k) => {
        const v = record[k];
        return v !== undefined && typeof v !== 'function' && typeof v !== 'symbol';
      })
      .sort();

    const pairs = keys.map((key) => `${JSON.stringify(key)}:${canonicalizeJcs(record[key])}`);
    return `{${pairs.join(',')}}`;
  }

  throw new Error(`JCS error: unsupported value type "${type}"`);
}

/**
 * Strips the top-level `signature` property from a manifest or federated index before canonicalization.
 */
export function stripSignatureField<T extends Record<string, unknown>>(obj: T): Omit<T, 'signature'> {
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k !== 'signature') {
      clone[k] = v;
    }
  }
  return clone as Omit<T, 'signature'>;
}
