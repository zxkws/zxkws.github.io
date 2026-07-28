import { client } from './httpClient';

export type CredentialEntry = {
  id: string;
  account: string;
  password: string;
  notes: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CredentialPayload = Pick<CredentialEntry, 'account' | 'password' | 'notes'>;

const unwrap = <T>(payload: unknown): T =>
  (payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: T }).data : payload) as T;

export const listCredentials = async (): Promise<CredentialEntry[]> =>
  unwrap<CredentialEntry[]>(await client('/v1/credential-vault/entries', {}, { method: 'GET' }));

export const createCredential = async (payload: CredentialPayload): Promise<CredentialEntry> =>
  unwrap<CredentialEntry>(await client('/v1/credential-vault/entries', payload, { method: 'POST' }));

export const updateCredential = async (
  id: string,
  payload: CredentialPayload & { version: number },
): Promise<CredentialEntry> =>
  unwrap<CredentialEntry>(await client(`/v1/credential-vault/entries/${id}`, payload, { method: 'PATCH' }));

export const deleteCredential = (id: string) => client(`/v1/credential-vault/entries/${id}`, {}, { method: 'DELETE' });
