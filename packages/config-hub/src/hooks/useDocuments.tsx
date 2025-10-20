import { useCallback, useEffect, useState } from 'react';
import { ConfigDocument, SystemConfigDoc } from '../types';
import { createInitialDocument, isSystemConfigDoc } from '../data/defaultDocument';
import { cloneDeep, createId, formatDateTime } from '../utils';

const STORAGE_KEY = 'config-hub:documents:v1';

type Updater = (_doc: SystemConfigDoc) => SystemConfigDoc;

const readFromStorage = (): ConfigDocument[] => {
  if (typeof window === 'undefined') {
    return [createInitialDocument()];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [createInitialDocument()];
  }

  try {
    const parsed = JSON.parse(raw) as ConfigDocument[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.warn('[ConfigHub] Failed to parse stored documents', error);
  }

  return [createInitialDocument()];
};

export const useDocuments = () => {
  const [documents, setDocuments] = useState<ConfigDocument[]>(() => readFromStorage());
  const [activeId, setActiveId] = useState<string>(() => documents[0]?.id ?? createInitialDocument().id);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  const selectDocument = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const addDocument = useCallback((name?: string) => {
    const nextDoc = createInitialDocument();
    if (name) {
      nextDoc.name = name;
    }
    setDocuments((prev) => [...prev, nextDoc]);
    setActiveId(nextDoc.id);
  }, []);

  const updateDocument = useCallback((id: string, updater: Updater) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== id) {
          return doc;
        }
        const nextData = updater(cloneDeep(doc.data));
        return {
          ...doc,
          updatedAt: formatDateTime(),
          data: nextData,
        };
      }),
    );
  }, []);

  const renameDocument = useCallback((id: string, name: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              name,
              updatedAt: formatDateTime(),
            }
          : doc,
      ),
    );
  }, []);

  const duplicateDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const target = prev.find((doc) => doc.id === id);
      if (!target) {
        return prev;
      }
      const cloned: ConfigDocument = {
        ...cloneDeep(target),
        id: createId(),
        name: `${target.name} Copy`,
        createdAt: formatDateTime(),
        updatedAt: formatDateTime(),
      };
      return [...prev, cloned];
    });
  }, []);

  const removeDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => {
        const next = prev.filter((doc) => doc.id !== id);
        if (next.length === 0) {
          return [createInitialDocument()];
        }
        if (id === activeId) {
          setActiveId(next[0].id);
        }
        return next;
      });
    },
    [activeId],
  );

  const importDocument = useCallback((payload: ImportPayload) => {
    const { content, name, description } = payload;
    if (!isSystemConfigDoc(content)) {
      throw new Error('Provided JSON is not a valid system configuration document');
    }
    const docId = createId();
    const now = formatDateTime();
    const newDoc: ConfigDocument = {
      id: docId,
      name: name || `Imported ${new Date().toLocaleString()}`,
      description,
      createdAt: now,
      updatedAt: now,
      data: cloneDeep(content),
    };
    setDocuments((prev) => [...prev, newDoc]);
    setActiveId(docId);
  }, []);

  const exportDocument = useCallback(
    (id: string): string | undefined => {
      const doc = documents.find((item) => item.id === id);
      if (!doc) {
        return undefined;
      }
      return JSON.stringify(doc.data, null, 2);
    },
    [documents],
  );

  useEffect(() => {
    if (documents.length > 0 && !documents.some((doc) => doc.id === activeId)) {
      setActiveId(documents[0].id);
    }
  }, [documents, activeId]);

  const activeDocument = documents.find((doc) => doc.id === activeId) ?? documents[0];

  return {
    documents,
    activeDocument,
    activeId,
    selectDocument,
    addDocument,
    updateDocument,
    renameDocument,
    duplicateDocument,
    removeDocument,
    importDocument,
    exportDocument,
  };
};
