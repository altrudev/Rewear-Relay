const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function importKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign', 'verify']
  );
}

export async function signCandidateSet(secret: string, payload: unknown): Promise<string> {
  if (secret.length < 32) throw new Error('SEARCH_SIGNING_KEY_WEAK');
  const payloadBytes = encoder.encode(JSON.stringify(payload));
  const key = await importKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, payloadBytes));
  return `v1.${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(signature)}`;
}

export async function verifyCandidateSet(secret: string, token: string): Promise<unknown> {
  if (secret.length < 32) throw new Error('SEARCH_SIGNING_KEY_WEAK');
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') throw new Error('CANDIDATE_SET_TOKEN_INVALID');

  try {
    const payloadBytes = base64UrlToBytes(parts[1]);
    const signature = base64UrlToBytes(parts[2]);
    const key = await importKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, signature, payloadBytes);
    if (!valid) throw new Error('CANDIDATE_SET_TOKEN_INVALID');
    return JSON.parse(decoder.decode(payloadBytes));
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'SEARCH_SIGNING_KEY_WEAK') throw cause;
    throw new Error('CANDIDATE_SET_TOKEN_INVALID');
  }
}
