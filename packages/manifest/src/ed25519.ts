/**
 * Pure TypeScript RFC 8032 Ed25519 + FIPS 180-4 SHA-256 / SHA-512 implementation.
 * Zero external dependencies, works synchronously in Browser, Web Worker, and Node,
 * and is 100% bit-compatible with Go's standard `crypto/ed25519` and RFC 8032 test vectors.
 */

const P = (1n << 255n) - 19n;
const L = (1n << 252n) + 27742317777372353535851937790883648493n;

function mod(a: bigint, m: bigint = P): bigint {
  const res = a % m;
  return res >= 0n ? res : res + m;
}

function modPow(base: bigint, exp: bigint, m: bigint = P): bigint {
  let result = 1n;
  let b = mod(base, m);
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = mod(result * b, m);
    b = mod(b * b, m);
    e >>= 1n;
  }
  return result;
}

function modInverse(a: bigint, m: bigint = P): bigint {
  return modPow(a, m - 2n, m);
}

const D = mod(-121665n * modInverse(121666n));
const I = modPow(2n, (P - 1n) / 4n);

interface ExtPoint {
  x: bigint;
  y: bigint;
  z: bigint;
  t: bigint;
}

const ZERO_POINT: ExtPoint = { x: 0n, y: 1n, z: 1n, t: 0n };

function recoverX(y: bigint, sign: bigint): bigint | null {
  if (y >= P) return null;
  const y2 = mod(y * y);
  const u = mod(y2 - 1n);
  const v = mod(D * y2 + 1n);
  let x2 = mod(u * modInverse(v));
  if (x2 === 0n) {
    return sign === 1n ? null : 0n;
  }
  let x = modPow(x2, (P + 3n) / 8n);
  if (mod(x * x - x2) !== 0n) {
    x = mod(x * I);
  }
  if (mod(x * x - x2) !== 0n) {
    return null;
  }
  if ((x & 1n) !== sign) {
    x = P - x;
  }
  return x;
}

const GY = mod(4n * modInverse(5n));
const GX = recoverX(GY, 0n)!;
const BASE_POINT: ExtPoint = { x: GX, y: GY, z: 1n, t: mod(GX * GY) };

function pointAdd(p: ExtPoint, q: ExtPoint): ExtPoint {
  const a = mod((p.y - p.x) * (q.y - q.x));
  const b = mod((p.y + p.x) * (q.y + q.x));
  const c = mod(p.t * 2n * D * q.t);
  const d = mod(p.z * 2n * q.z);
  const e = mod(b - a);
  const f = mod(d - c);
  const g = mod(d + c);
  const h = mod(b + a);
  return {
    x: mod(e * f),
    y: mod(g * h),
    z: mod(f * g),
    t: mod(e * h)
  };
}

function scalarMult(p: ExtPoint, scalar: bigint): ExtPoint {
  let result = ZERO_POINT;
  let addend = p;
  let n = scalar;
  while (n > 0n) {
    if (n & 1n) {
      result = pointAdd(result, addend);
    }
    addend = pointAdd(addend, addend);
    n >>= 1n;
  }
  return result;
}

function encodePoint(p: ExtPoint): Uint8Array {
  const zInv = modInverse(p.z);
  const x = mod(p.x * zInv);
  const y = mod(p.y * zInv);
  const out = new Uint8Array(32);
  let tmp = y;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }
  out[31] |= Number(x & 1n) << 7;
  return out;
}

function decodePoint(bytes: Uint8Array): ExtPoint | null {
  if (bytes.length !== 32) return null;
  let y = 0n;
  for (let i = 0; i < 32; i++) {
    y |= BigInt(bytes[i]!) << BigInt(8 * i);
  }
  const sign = (y >> 255n) & 1n;
  y &= (1n << 255n) - 1n;
  const x = recoverX(y, sign);
  if (x === null) return null;
  return { x, y, z: 1n, t: mod(x * y) };
}

function bytesToNumberLE(bytes: Uint8Array): bigint {
  let res = 0n;
  for (let i = 0; i < bytes.length; i++) {
    res |= BigInt(bytes[i]!) << BigInt(8 * i);
  }
  return res;
}

function numberToBytesLE(num: bigint, len: number): Uint8Array {
  const out = new Uint8Array(len);
  let n = num;
  for (let i = 0; i < len; i++) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

// Pure TS SHA-256 implementation (FIPS 180-4)
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function rotr32(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function sha256Bytes(data: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bitLen = data.length * 8;
  const padLen = ((data.length + 9 + 63) & ~63);
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr32(w[i - 15]!, 7) ^ rotr32(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr32(w[i - 2]!, 17) ^ rotr32(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i]! + w[i]!) >>> 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

// Pure TS SHA-512 implementation (FIPS 180-4) for Ed25519
const SHA512_K: bigint[] = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
  0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
  0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
  0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
  0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
  0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
  0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n,
  0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
  0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn,
  0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n
];

const MASK64 = 0xffffffffffffffffn;

function rotr64(x: bigint, n: bigint): bigint {
  return ((x >> n) | ((x << (64n - n)) & MASK64)) & MASK64;
}

export function sha512Bytes(...chunks: Uint8Array[]): Uint8Array {
  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const data = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    data.set(c, pos);
    pos += c.length;
  }

  let h0 = 0x6a09e667f3bcc908n;
  let h1 = 0xbb67ae8584caa73bn;
  let h2 = 0x3c6ef372fe94f82bn;
  let h3 = 0xa54ff53a5f1d36f1n;
  let h4 = 0x510e527fade682d1n;
  let h5 = 0x9b05688c2b3e6c1fn;
  let h6 = 0x1f83d9abfb41bd6bn;
  let h7 = 0x5be0cd19137e2179n;

  const bitLen = BigInt(data.length) * 8n;
  const padLen = (data.length + 17 + 127) & ~127;
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setBigUint64(padLen - 8, bitLen, false);

  const w = new Array<bigint>(80).fill(0n);
  for (let offset = 0; offset < padLen; offset += 128) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getBigUint64(offset + i * 8, false);
    }
    for (let i = 16; i < 80; i++) {
      const w15 = w[i - 15]!;
      const w2 = w[i - 2]!;
      const s0 = rotr64(w15, 1n) ^ rotr64(w15, 8n) ^ (w15 >> 7n);
      const s1 = rotr64(w2, 19n) ^ rotr64(w2, 61n) ^ (w2 >> 6n);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) & MASK64;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 80; i++) {
      const S1 = rotr64(e, 14n) ^ rotr64(e, 18n) ^ rotr64(e, 41n);
      const ch = (e & f) ^ ((~e & MASK64) & g);
      const temp1 = (h + S1 + ch + SHA512_K[i]! + w[i]!) & MASK64;
      const S0 = rotr64(a, 28n) ^ rotr64(a, 34n) ^ rotr64(a, 39n);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) & MASK64;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) & MASK64;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) & MASK64;
    }

    h0 = (h0 + a) & MASK64;
    h1 = (h1 + b) & MASK64;
    h2 = (h2 + c) & MASK64;
    h3 = (h3 + d) & MASK64;
    h4 = (h4 + e) & MASK64;
    h5 = (h5 + f) & MASK64;
    h6 = (h6 + g) & MASK64;
    h7 = (h7 + h) & MASK64;
  }

  const out = new Uint8Array(64);
  const outView = new DataView(out.buffer);
  outView.setBigUint64(0, h0, false);
  outView.setBigUint64(8, h1, false);
  outView.setBigUint64(16, h2, false);
  outView.setBigUint64(24, h3, false);
  outView.setBigUint64(32, h4, false);
  outView.setBigUint64(40, h5, false);
  outView.setBigUint64(48, h6, false);
  outView.setBigUint64(56, h7, false);
  return out;
}

export function ed25519GetPublicKey(seed32: Uint8Array): Uint8Array {
  if (seed32.length !== 32) {
    throw new Error('Ed25519 seed must be 32 bytes');
  }
  const h = sha512Bytes(seed32);
  const sBytes = h.slice(0, 32);
  sBytes[0]! &= 248;
  sBytes[31]! &= 127;
  sBytes[31]! |= 64;
  const s = bytesToNumberLE(sBytes);
  return encodePoint(scalarMult(BASE_POINT, s));
}

export function ed25519Sign(message: Uint8Array, seed32: Uint8Array): Uint8Array {
  if (seed32.length !== 32) {
    throw new Error('Ed25519 seed must be 32 bytes');
  }
  const h = sha512Bytes(seed32);
  const sBytes = h.slice(0, 32);
  sBytes[0]! &= 248;
  sBytes[31]! &= 127;
  sBytes[31]! |= 64;
  const s = bytesToNumberLE(sBytes);
  const prefix = h.slice(32, 64);
  const pubKey = encodePoint(scalarMult(BASE_POINT, s));

  const rHash = sha512Bytes(prefix, message);
  const r = mod(bytesToNumberLE(rHash), L);
  const R = encodePoint(scalarMult(BASE_POINT, r));

  const kHash = sha512Bytes(R, pubKey, message);
  const k = mod(bytesToNumberLE(kHash), L);
  const S = mod(r + k * s, L);
  const SBytes = numberToBytesLE(S, 32);

  const sig = new Uint8Array(64);
  sig.set(R, 0);
  sig.set(SBytes, 32);
  return sig;
}

export function ed25519Verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
  if (signature.length !== 64 || publicKey.length !== 32) {
    return false;
  }
  const RBytes = signature.slice(0, 32);
  const SBytes = signature.slice(32, 64);
  const S = bytesToNumberLE(SBytes);
  if (S >= L) {
    return false;
  }
  const R = decodePoint(RBytes);
  const A = decodePoint(publicKey);
  if (!R || !A) {
    return false;
  }
  const kHash = sha512Bytes(RBytes, publicKey, message);
  const k = mod(bytesToNumberLE(kHash), L);

  const lhs = encodePoint(scalarMult(BASE_POINT, S));
  const rhs = encodePoint(pointAdd(R, scalarMult(A, k)));

  let diff = 0;
  for (let i = 0; i < 32; i++) {
    diff |= lhs[i]! ^ rhs[i]!;
  }
  return diff === 0;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0 || !/^[0-9a-f]*$/.test(clean)) {
    throw new Error('Invalid hex string');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}
