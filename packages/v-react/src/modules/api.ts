import axios from 'axios';
import { Note } from './store';

const isProd = import.meta.env.PROD;
const http = axios.create({
  baseURL: isProd ? 'https://system.zxkws.nyc.mn/api' : '/api',
  withCredentials: true,
});

export const listNotes = async (): Promise<Note[]> => {
  const { data } = await http.get('/notes');
  return data;
};

export const getNote = async (id: string): Promise<Note> => {
  const { data } = await http.get(`/notes/${id}`);
  return data;
};

export const createNote = async (payload: Partial<Note>) => {
  const { data } = await http.post('/notes', payload);
  return data as Note;
};

export const createDaily = async (date: string) => {
  const { data } = await http.post('/notes/daily', { date });
  return data as Note;
};

export const patchNote = async (
  id: string,
  payload: Partial<Note> & { version?: number },
) => {
  const { data } = await http.patch(`/notes/${id}`, payload);
  return data as Note;
};

export const deleteNote = async (id: string) => {
  const { data } = await http.post(`/notes/${id}/delete`);
  return data;
};
