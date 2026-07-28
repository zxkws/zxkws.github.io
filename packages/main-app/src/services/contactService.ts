import { backgroundClient } from './httpClient';

export type ContactRequest = {
  email: string;
  message: string;
  messageHtml?: string;
  company?: string;
  imageTokens?: string[];
};

export type ContactImageUpload = {
  url: string;
  token: string;
  name: string;
};

const unwrap = <T>(payload: unknown): T =>
  (payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: T }).data : payload) as T;

export const uploadContactImage = async (file: File): Promise<ContactImageUpload> => {
  const formData = new FormData();
  formData.append('file', file, file.name);
  return unwrap<ContactImageUpload>(await backgroundClient('/contact/image', formData, { method: 'POST', file: true }));
};

export const submitContactRequest = async (payload: ContactRequest): Promise<void> => {
  await backgroundClient('/contact', payload, { method: 'POST' });
};
