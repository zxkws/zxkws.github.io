import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDaily, createNote, listNotes, patchNote } from './api';
import { createEmptyDaily, useNoteStore, Note } from './store';
import debounce from 'lodash.debounce';
import dayjs from 'dayjs';

const SAVE_DEBOUNCE = 1200;

export const useNotes = () => {
  const qc = useQueryClient();
  const notes = useNoteStore((s) => s.notes);
  const ui = useNoteStore((s) => s.ui);
  const syncFromServer = useNoteStore((s) => s.syncFromServer);
  const upsert = useNoteStore((s) => s.upsert);
  const setActive = useNoteStore((s) => s.setActive);
  const [saving, setSaving] = useState<'idle' | 'local' | 'syncing' | 'error'>('idle');

  const listQuery = useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: listNotes,
  });

  const mutateNote = useMutation({
    mutationFn: async (payload: { id: string; contentMd: string; version?: number }) => {
      setSaving('syncing');
      const res = await patchNote(payload.id, payload);
      return res;
    },
    onSuccess(data) {
      upsert(data);
      setSaving('idle');
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
    onError() {
      setSaving('error');
    },
  });

  // useMutation 每次 render 都返回新对象，用 ref 转发以保证防抖实例稳定
  const mutateNoteRef = useRef(mutateNote);
  useEffect(() => {
    mutateNoteRef.current = mutateNote;
  });

  const debouncedSave = useMemo(
    () =>
      debounce((id: string, contentMd: string, version?: number) => {
        setSaving('local');
        mutateNoteRef.current.mutate({ id, contentMd, version });
      }, SAVE_DEBOUNCE),
    [],
  );

  const createDailyMutation = useMutation({
    mutationFn: () => createDaily(dayjs().format('YYYY-MM-DD')),
    onSuccess(data) {
      upsert(data);
      setActive(data.id);
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const createEmptyMutation = useMutation({
    mutationFn: () => createNote(createEmptyDaily()),
    onSuccess(data) {
      upsert(data);
      setActive(data.id);
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const activeNote = ui.activeId ? notes[ui.activeId] : undefined;
  const operationError = listQuery.error || mutateNote.error || createDailyMutation.error || createEmptyMutation.error;
  const errorMessage = operationError
    ? operationError instanceof Error
      ? operationError.message
      : String(operationError)
    : '';

  useEffect(() => {
    if (listQuery.data) {
      syncFromServer(listQuery.data);
    }
  }, [listQuery.data, syncFromServer]);

  useEffect(
    () => () => {
      debouncedSave.cancel();
    },
    [debouncedSave],
  );

  return {
    listQuery,
    notes,
    ui,
    activeNote,
    saving,
    errorMessage,
    setActive,
    createToday: () => createDailyMutation.mutate(),
    createBlank: () => createEmptyMutation.mutate(),
    updateContent: (id: string, contentMd: string, version?: number) => debouncedSave(id, contentMd, version),
  };
};
