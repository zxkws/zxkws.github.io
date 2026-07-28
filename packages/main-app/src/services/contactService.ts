import { backgroundClient } from './httpClient';

export type ContactRequest = {
  email: string;
  message: string;
  company?: string;
  images?: Array<{
    name: string;
    type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
    data: string;
  }>;
};

export const submitContactRequest = async (payload: ContactRequest): Promise<void> => {
  await backgroundClient('/contact', payload, { method: 'POST' });
};
