import { useEffect, useMemo, useState } from 'react';
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
  const hydrate = useNoteStore((s) => s.hydrate);
  const upsert = useNoteStore((s) => s.upsert);
  const setActive = useNoteStore((s) => s.setActive);
  const [saving, setSaving] = useState<'idle' | 'local' | 'syncing' | 'error'>(
    'idle',
  );

  const listQuery = useQuery<Note[]>({
    queryKey: ['notes'],
    queryFn: listNotes,
  });

  const mutateNote = useMutation({
    mutationFn: async (payload: {
      id: string;
      contentMd: string;
      version?: number;
    }) => {
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

  const debouncedSave = useMemo(
    () =>
      debounce((id: string, contentMd: string, version?: number) => {
        setSaving('local');
        mutateNote.mutate({ id, contentMd, version });
      }, SAVE_DEBOUNCE),
    [mutateNote],
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

  useEffect(() => {
    if (listQuery.data) {
      hydrate(listQuery.data);
    }
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave, hydrate, listQuery.data]);

  return {
    listQuery,
    notes,
    ui,
    activeNote,
    saving,
    setActive,
    createToday: () => createDailyMutation.mutate(),
    createBlank: () => createEmptyMutation.mutate(),
    updateContent: (id: string, contentMd: string, version?: number) =>
      debouncedSave(id, contentMd, version),
  };
};
