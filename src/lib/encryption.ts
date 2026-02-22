const IV_LENGTH = 12;
const TAG_BIT_LENGTH = 128;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return crypto.subtle.importKey(
    "raw",
    hexToBytes(hex).buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext string. Returns a base64 string containing IV + ciphertext + auth tag.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: TAG_BIT_LENGTH },
    key,
    encoded
  );

  // Prepend IV to ciphertext+tag
  const result = new Uint8Array(IV_LENGTH + cipherBuf.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(cipherBuf), IV_LENGTH);

  return btoa(String.fromCharCode(...result));
}

/**
 * Decrypt a base64 string produced by encrypt().
 */
export async function decrypt(encoded: string): Promise<string> {
  const key = await getKey();
  const raw = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));

  const iv = raw.slice(0, IV_LENGTH);
  const ciphertext = raw.slice(IV_LENGTH);

  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: TAG_BIT_LENGTH },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plainBuf);
}

/**
 * Check if ENCRYPTION_KEY is configured (non-throwing).
 */
export function isEncryptionAvailable(): boolean {
  const hex = process.env.ENCRYPTION_KEY;
  return !!hex && hex.length === 64;
}
