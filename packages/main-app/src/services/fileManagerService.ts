import { client } from './httpClient';

export type UploadRecord = {
  id: number;
  filename: string;
  mimeType?: string;
  size?: number | string;
  url: string;
  signedUrl?: string;
  previewUrl?: string;
  workerFileId?: string;
  workerHost?: string;
  uploader?: string;
  createdAt: string;
  updatedAt: string;
};

export type UploadCapabilities = {
  maxUploadBytes: number;
  acceptsAnyFileType: boolean;
};

const unwrap = <T>(payload: unknown): T =>
  (payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: T }).data : payload) as T;

export const listUploadRecords = async (): Promise<UploadRecord[]> =>
  unwrap<UploadRecord[]>(await client('/v1/upload/records', {}, { method: 'GET' }));

export const getUploadCapabilities = async (): Promise<UploadCapabilities> =>
  unwrap<UploadCapabilities>(await client('/v1/upload/capabilities', {}, { method: 'GET' }));

export const uploadManagedFile = async (file: File): Promise<UploadRecord> => {
  const formData = new FormData();
  formData.append('file', file, file.name);
  return unwrap<UploadRecord>(await client('/v1/upload/file', formData, { method: 'POST', file: true }));
};

export const deleteUploadRecords = (ids: number[]) => client('/v1/upload/records', { ids }, { method: 'DELETE' });
