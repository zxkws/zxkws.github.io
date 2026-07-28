import { client } from './httpClient';

export type VaultMetadata =
  | { configured: false }
  | {
      configured: true;
      algorithm: string;
      kdf: string;
      kdfSalt: string;
      kdfIterations: number;
      checkIv: string;
      checkCiphertext: string;
      createdAt: string;
      updatedAt: string;
    };

export type VaultMetadataPayload = {
  kdfSalt: string;
  kdfIterations: number;
  checkIv: string;
  checkCiphertext: string;
};

export type EncryptedCredentialEntry = {
  id: string;
  ownerUserId: string;
  iv: string;
  ciphertext: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

const unwrap = <T>(payload: unknown): T =>
  (payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: T }).data : payload) as T;

export const getVaultMetadata = async (): Promise<VaultMetadata> =>
  unwrap<VaultMetadata>(await client('/v1/credential-vault/metadata', {}, { method: 'GET' }));

export const setupVault = async (payload: VaultMetadataPayload): Promise<VaultMetadata> =>
  unwrap<VaultMetadata>(await client('/v1/credential-vault/setup', payload, { method: 'POST' }));

export const listEncryptedCredentials = async (): Promise<EncryptedCredentialEntry[]> =>
  unwrap<EncryptedCredentialEntry[]>(await client('/v1/credential-vault/entries', {}, { method: 'GET' }));

export const createEncryptedCredential = async (payload: { iv: string; ciphertext: string }) =>
  unwrap<EncryptedCredentialEntry>(await client('/v1/credential-vault/entries', payload, { method: 'POST' }));

export const updateEncryptedCredential = async (
  id: string,
  payload: { iv: string; ciphertext: string; version: number },
) => unwrap<EncryptedCredentialEntry>(await client(`/v1/credential-vault/entries/${id}`, payload, { method: 'PATCH' }));

export const deleteEncryptedCredential = (id: string) =>
  client(`/v1/credential-vault/entries/${id}`, {}, { method: 'DELETE' });

export const rotateVault = async (
  payload: VaultMetadataPayload & {
    entries: Array<{ id: string; iv: string; ciphertext: string; version: number }>;
  },
): Promise<VaultMetadata> =>
  unwrap<VaultMetadata>(await client('/v1/credential-vault/rotate', payload, { method: 'POST' }));

export const resetVault = () => client('/v1/credential-vault', { confirmation: 'DELETE' }, { method: 'DELETE' });
