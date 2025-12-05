import { useCallback, useEffect, useState } from 'react';
import { ConfigDocument, SystemConfigDoc } from '../types';
import { createInitialDocument, isSystemConfigDoc } from '../data/defaultDocument';
import { cloneDeep, createId, formatDateTime } from '../utils';
import { fetchConfig, saveConfig } from '../services/configApi';

type Updater = (_doc: SystemConfigDoc) => SystemConfigDoc;

export const useDocuments = () => {
  const [documents, setDocuments] = useState<ConfigDocument[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const data = await fetchConfig();
        const now = formatDateTime();
        const doc: ConfigDocument = {
          id: 'remote-config',
          name: 'System Config',
          description: '远程微应用配置',
          createdAt: now,
          updatedAt: data.updatedAt ?? now,
          data,
        };
        setDocuments([doc]);
        setActiveId(doc.id);
      } catch (err) {
        console.error(err);
        const fallback = createInitialDocument();
        setDocuments([fallback]);
        setActiveId(fallback.id);
        setError(err instanceof Error ? err.message : '加载配置失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
        setDirty(true);
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
    setDirty(true);
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
    setDirty(true);
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
    setDirty(true);
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

  const saveActive = useCallback(async () => {
    const doc = documents.find((d) => d.id === activeId);
    if (!doc) return;
    if (!isSystemConfigDoc(doc.data)) {
      throw new Error('当前文档不是有效的系统配置 JSON');
    }
    setSaving(true);
    try {
      await saveConfig(doc.data);
      setDirty(false);
      setDocuments((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, updatedAt: formatDateTime() } : item)),
      );
    } finally {
      setSaving(false);
    }
  }, [documents, activeId]);

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
    loading,
    saving,
    error,
    dirty,
    selectDocument,
    addDocument,
    updateDocument,
    renameDocument,
    duplicateDocument,
    removeDocument,
    importDocument,
    exportDocument,
    saveActive,
  };
};
