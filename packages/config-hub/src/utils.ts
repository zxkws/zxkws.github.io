export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const formatDateTime = (input?: string | Date): string => {
  const date = input ? new Date(input) : new Date();
  return date.toISOString();
};

export const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));
