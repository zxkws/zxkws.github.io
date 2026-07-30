import type { CommandReceipt, ResourceRef } from '../domain';

export function createMutationId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function receiptEntityId(receipt: CommandReceipt<ResourceRef>) {
  return receipt.resource.entityId;
}
