import type { Attachment, AttachmentUploadGrant, EntityId, EntityVersion } from '../domain';
import type { AgentWorkspaceClient } from './client';

export type AttachmentUploadIdempotencyKeys = {
  createUploadIntent: string;
  completeUpload: string;
};

export type DirectAttachmentUploadInput = {
  client: AgentWorkspaceClient;
  projectId: EntityId;
  file: File;
  idempotencyKeys: AttachmentUploadIdempotencyKeys;
  signal?: AbortSignal;
};

export class DirectAttachmentUploadError extends Error {
  readonly code:
    | 'INVALID_INPUT'
    | 'WEB_CRYPTO_UNAVAILABLE'
    | 'INVALID_UPLOAD_GRANT'
    | 'FILE_TOO_LARGE'
    | 'OBJECT_UPLOAD_FAILED';
  readonly status: number | null;

  constructor(code: DirectAttachmentUploadError['code'], message: string, status: number | null = null) {
    super(message);
    this.name = 'DirectAttachmentUploadError';
    this.code = code;
    this.status = status;
  }
}

const throwIfAborted = (signal?: AbortSignal) => {
  if (!signal?.aborted) return;
  if (signal.reason !== undefined) throw signal.reason;
  throw new DOMException('The operation was aborted.', 'AbortError');
};

const requireNonBlank = (value: string, label: string) => {
  if (value.trim().length === 0) {
    throw new DirectAttachmentUploadError('INVALID_INPUT', `${label} must not be blank`);
  }
};

const sha256Hex = async (file: File, signal?: AbortSignal) => {
  throwIfAborted(signal);
  if (!globalThis.crypto?.subtle) {
    throw new DirectAttachmentUploadError('WEB_CRYPTO_UNAVAILABLE', 'Web Crypto SHA-256 is unavailable');
  }

  const bytes = await file.arrayBuffer();
  throwIfAborted(signal);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  throwIfAborted(signal);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const validateUploadGrant = (
  grant: AttachmentUploadGrant,
  fileSize: number,
): {
  attachmentId: string;
  attachmentVersion: EntityVersion;
  uploadUrl: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
} => {
  if (
    !grant ||
    typeof grant.attachmentId !== 'string' ||
    grant.attachmentId.trim().length === 0 ||
    typeof grant.uploadUrl !== 'string' ||
    grant.uploadUrl.trim().length === 0 ||
    (grant.method !== 'PUT' && grant.method !== 'POST') ||
    !grant.headers ||
    typeof grant.headers !== 'object' ||
    Array.isArray(grant.headers) ||
    Object.values(grant.headers).some((value) => typeof value !== 'string') ||
    !Number.isSafeInteger(grant.attachmentVersion) ||
    grant.attachmentVersion < 1 ||
    !Number.isSafeInteger(grant.maxBytes) ||
    grant.maxBytes < 0
  ) {
    throw new DirectAttachmentUploadError('INVALID_UPLOAD_GRANT', 'Attachment upload grant is invalid');
  }

  if (fileSize > grant.maxBytes) {
    throw new DirectAttachmentUploadError(
      'FILE_TOO_LARGE',
      `Attachment size ${fileSize} exceeds upload grant maxBytes ${grant.maxBytes}`,
    );
  }

  return {
    attachmentId: grant.attachmentId,
    attachmentVersion: grant.attachmentVersion,
    uploadUrl: grant.uploadUrl,
    method: grant.method,
    headers: grant.headers,
  };
};

export async function uploadAttachmentDirect({
  client,
  projectId,
  file,
  idempotencyKeys,
  signal,
}: DirectAttachmentUploadInput): Promise<Attachment> {
  requireNonBlank(projectId, 'projectId');
  requireNonBlank(file.name, 'file.name');
  requireNonBlank(idempotencyKeys.createUploadIntent, 'createUploadIntent idempotency key');
  requireNonBlank(idempotencyKeys.completeUpload, 'completeUpload idempotency key');
  if (idempotencyKeys.createUploadIntent === idempotencyKeys.completeUpload) {
    throw new DirectAttachmentUploadError(
      'INVALID_INPUT',
      'Upload intent and completion must use different idempotency keys',
    );
  }
  if (!Number.isSafeInteger(file.size) || file.size < 0) {
    throw new DirectAttachmentUploadError('INVALID_INPUT', 'file.size must be a safe integer');
  }

  const sha256 = await sha256Hex(file, signal);
  throwIfAborted(signal);

  const intentReceipt = await client.createAttachmentUpload({
    projectId,
    fileName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
    sha256,
    clientMutationId: idempotencyKeys.createUploadIntent,
  });
  throwIfAborted(signal);

  const grant = validateUploadGrant(intentReceipt.resource, file.size);
  const uploadResponse = await fetch(grant.uploadUrl, {
    method: grant.method,
    headers: grant.headers,
    body: file,
    signal,
  });
  if (!uploadResponse.ok) {
    throw new DirectAttachmentUploadError(
      'OBJECT_UPLOAD_FAILED',
      `Private object upload failed with HTTP ${uploadResponse.status}`,
      uploadResponse.status,
    );
  }
  throwIfAborted(signal);

  await client.completeAttachmentUpload(grant.attachmentId, {
    clientMutationId: idempotencyKeys.completeUpload,
    expectedVersion: grant.attachmentVersion,
    sizeBytes: file.size,
    sha256,
  });
  throwIfAborted(signal);

  return client.getAttachment(grant.attachmentId, signal);
}
