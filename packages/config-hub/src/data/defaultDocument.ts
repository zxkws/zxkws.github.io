import { ConfigDocument, SystemConfigDoc } from '../types';
import { createId, formatDateTime } from '../utils';

const createDefaultConfig = (): SystemConfigDoc => ({
  version: '1.0.0',
  updatedAt: formatDateTime(),
  metadata: {
    owner: 'default',
    environments: ['development', 'staging', 'production'],
  },
  microApps: [],
  standaloneMenus: [],
});

export const createInitialDocument = (): ConfigDocument => {
  const now = formatDateTime();
  return {
    id: createId(),
    name: 'Default Workspace',
    description: 'Initial configuration workspace',
    createdAt: now,
    updatedAt: now,
    data: createDefaultConfig(),
  };
};

export const isSystemConfigDoc = (candidate: unknown): candidate is SystemConfigDoc => {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }
  if (!('microApps' in candidate)) {
    return false;
  }
  const maybe = candidate as { microApps?: unknown };
  return Array.isArray(maybe.microApps);
};
