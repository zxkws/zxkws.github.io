export const VAULT_KDF_ITERATIONS = 600_000;
const VAULT_CHECK_VALUE = 'LIGHTSPACE_CREDENTIAL_VAULT_V1';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

export type CredentialPayload = {
  name: string;
  platform: string;
  account: string;
  secret: string;
  url: string;
  notes: string;
};

export type EncryptedValue = {
  iv: string;
  ciphertext: string;
};

export type VaultMaterial = EncryptedValue & {
  key: CryptoKey;
  kdfSalt: string;
  kdfIterations: number;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

export const deriveVaultKey = async (
  masterPassword: string,
  saltBase64: string,
  iterations: number,
): Promise<CryptoKey> => {
  const material = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(encoder.encode(masterPassword)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(base64ToBytes(saltBase64)),
      iterations,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export const encryptText = async (key: CryptoKey, plaintext: string): Promise<EncryptedValue> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoder.encode(plaintext)),
  );
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
};

export const decryptText = async (key: CryptoKey, encrypted: EncryptedValue): Promise<string> => {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(base64ToBytes(encrypted.iv)) },
    key,
    toArrayBuffer(base64ToBytes(encrypted.ciphertext)),
  );
  return decoder.decode(plaintext);
};

export const createVaultMaterial = async (masterPassword: string): Promise<VaultMaterial> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const kdfSalt = bytesToBase64(salt);
  const key = await deriveVaultKey(masterPassword, kdfSalt, VAULT_KDF_ITERATIONS);
  const check = await encryptText(key, VAULT_CHECK_VALUE);
  return {
    key,
    kdfSalt,
    kdfIterations: VAULT_KDF_ITERATIONS,
    iv: check.iv,
    ciphertext: check.ciphertext,
  };
};

export const unlockVault = async (
  masterPassword: string,
  metadata: {
    kdfSalt: string;
    kdfIterations: number;
    checkIv: string;
    checkCiphertext: string;
  },
): Promise<CryptoKey> => {
  const key = await deriveVaultKey(masterPassword, metadata.kdfSalt, metadata.kdfIterations);
  const check = await decryptText(key, {
    iv: metadata.checkIv,
    ciphertext: metadata.checkCiphertext,
  });
  if (check !== VAULT_CHECK_VALUE) throw new Error('主密码不正确');
  return key;
};

export const encryptCredential = (key: CryptoKey, payload: CredentialPayload) =>
  encryptText(key, JSON.stringify(payload));

export const decryptCredential = async (key: CryptoKey, encrypted: EncryptedValue): Promise<CredentialPayload> => {
  const parsed = JSON.parse(await decryptText(key, encrypted)) as Record<string, unknown>;
  const fields: (keyof CredentialPayload)[] = ['name', 'platform', 'account', 'secret', 'url', 'notes'];
  if (fields.some((field) => typeof parsed[field] !== 'string')) {
    throw new Error('账号条目内容无效');
  }
  return parsed as CredentialPayload;
};

const randomIndex = (max: number): number => {
  const ceiling = 256 - (256 % max);
  const bytes = new Uint8Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= ceiling);
  return bytes[0] % max;
};

export const generateCredentialPassword = (length = 24): string => {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*_-+='];
  const all = groups.join('');
  const result = groups.map((group) => group[randomIndex(group.length)]);
  while (result.length < length) result.push(all[randomIndex(all.length)]);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result.join('');
};
