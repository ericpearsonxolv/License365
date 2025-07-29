// src/utils/fetchAllUsers.js

/**
 * Fetch a single page of users from the API, optionally with filters.
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (starts at 1)
 * @param {number} options.pageSize - Number of users per page
 * @param {object} [options.filters] - Filters (status, license, department, etc)
 * @param {string} [options.apiBase] - API base URL
 * @returns {Promise<{users: Array, totalCount: number, skus?: Array}>}
 */
export async function fetchUsersPage({
  page = 1,
  pageSize = 100,
  filters = {},
  apiBase = '/api/GetUsers'
} = {}) {
  // Build query string for filters
  const params = new URLSearchParams({ page, size: pageSize, ...filters });

  const res = await fetch(`${apiBase}?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);

  const data = await res.json();

  return {
    users: data.users || data.value || [],
    totalCount: data.totalCount || data.total || 0,
    skus: data.skus || []
  };
}