// src/Utils/getSkuDisplayName.js

import skuLookup from "../assets/skuLookup";

/**
 * Get the Microsoft-friendly display name for a SKU ID.
 * Looks up from the local lookup, or from the provided skus list, or falls back to the ID.
 *
 * @param {string} skuId - The SKU GUID to look up.
 * @param {Array} skus - Optionally, an array of all SKUs (as returned by your API).
 * @returns {string} - The Microsoft-friendly name.
 */
export function getSkuDisplayName(skuId, skus = []) {
  // Try local lookup table first
  if (skuLookup[skuId]) return skuLookup[skuId];

  // Try skus array from API response, if provided
  if (skus && skus.length > 0) {
    const found = skus.find(
      s =>
        s.skuId === skuId ||
        s.skuPartNumber === skuId ||
        s.displayName === skuId
    );
    if (found && found.displayName) return found.displayName;
  }

  // Fallback: show the raw SKU ID
  return skuId;
}