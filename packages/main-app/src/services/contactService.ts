import { backgroundClient } from './httpClient';

export type ContactRequest = {
  email: string;
  message: string;
  company?: string;
};

export const submitContactRequest = async (payload: ContactRequest): Promise<void> => {
  await backgroundClient('/contact', payload, { method: 'POST' });
};
