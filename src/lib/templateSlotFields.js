/**
 * src/lib/templateSlotFields.js
 *
 * Backward-compatible re-export from the authoritative pageContracts.js.
 * All call sites that import getAllowedSlotFields or filterToAllowedFields
 * continue to work unchanged.
 *
 * New code should import directly from '@/content-contracts/pageContracts'.
 */

import {
  getContractFields,
  filterToContractFields,
  validateContractContent,
  toCanonicalObjectList,
  PAGE_CONTRACTS,
} from '@/content-contracts/pageContracts';

/**
 * Build the legacy SLOT_CONTENT_FIELDS shape for any consumers that still
 * enumerate keys directly. This is kept for read compatibility only.
 */
export const SLOT_CONTENT_FIELDS = (() => {
  const out = {};
  for (const [tKey, contract] of Object.entries(PAGE_CONTRACTS)) {
    for (const [rKey, reg] of Object.entries(contract.regions)) {
      if (reg.fields && reg.fields.length > 0) {
        out[`${tKey}.${rKey}`] = reg.fields;
      }
    }
  }
  return out;
})();

/**
 * Return the field definitions for a template slot.
 * Returns null for unknown combinations (fail-closed).
 */
export function getAllowedSlotFields(templateKey, slotKey) {
  return getContractFields(templateKey, slotKey);
}

/**
 * Filter a content object to only declared canonical fields.
 * Returns null for unknown region (caller should reject with 400).
 *
 * IMPORTANT: Does NOT delete other fields from the DB — only writes canonical fields.
 */
export function filterToAllowedFields(templateKey, slotKey, content) {
  return filterToContractFields(templateKey, slotKey, content);
}

/**
 * Strictly validate content against the contract.
 * Returns { valid, unknownFields, invalidFields }.
 */
export { validateContractContent, toCanonicalObjectList };
