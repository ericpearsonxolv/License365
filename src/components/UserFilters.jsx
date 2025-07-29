import React from "react";
import { getSkuDisplayName } from "../Utils/getSkuDisplayName";

const UserFilters = ({
  skus,
  departments,
  filterStatus,
  filterLicense,
  filterDepartment,
  signInFilter,
  filterWaste,
  filterOnLeave,
  noLicenseOnly,
  onNoLicenseOnlyChange,
  searchText,
  onSearchTextChange,
  onStatusChange,
  onLicenseChange,
  onDepartmentChange,
  onSignInFilterChange,
  onWasteChange,
  onOnLeaveChange,
  onDownloadCSV,
  filteredUsers,
}) => {
  return (
    <div className="mb-4 flex flex-wrap gap-4 items-center sticky top-0 bg-white/95 dark:bg-gray-900/90 z-30 py-2 rounded shadow text-gray-900 dark:text-white w-full transition">
      {/* Search bar */}
      <input
        type="text"
        placeholder="Search by name or email"
        className="px-3 py-2 rounded border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white"
        value={searchText}
        onChange={e => onSearchTextChange(e.target.value)}
        style={{ minWidth: 220 }}
      />

      <select
        className="bg-white dark:bg-gray-800 border dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded"
        value={filterStatus}
        onChange={onStatusChange}
      >
        <option value="">All Statuses</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>

      <select
        className="bg-white dark:bg-gray-800 border dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded"
        value={filterLicense}
        onChange={onLicenseChange}
      >
        <option value="">All Licenses</option>
        {skus.map((sku) => (
          <option key={sku.skuId} value={sku.skuId}>
            {getSkuDisplayName(sku.skuId, skus)}
          </option>
        ))}
      </select>

      <select
        className="bg-white dark:bg-gray-800 border dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded"
        value={filterDepartment}
        onChange={onDepartmentChange}
      >
        <option value="">All Departments</option>
        {departments.map((dept) => (
          <option key={dept} value={dept}>{dept}</option>
        ))}
      </select>

      <select
        className="bg-white dark:bg-gray-800 border dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded"
        value={signInFilter}
        onChange={onSignInFilterChange}
      >
        <option value="">All Last Sign-ins</option>
        <option value="1m">Last 1 Month</option>
        <option value="3m">Last 3 Months</option>
        <option value="6m">Last 6 Months</option>
        <option value="12m">Beyond 1 Year</option>
      </select>

      <select
        className="bg-white dark:bg-gray-800 border dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded"
        value={filterWaste}
        onChange={onWasteChange}
      >
        <option value="">All Accounts</option>
        <option value="waste">Potential Waste Only</option>
        <option value="nonwaste">Non-Waste Only</option>
      </select>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={filterOnLeave}
          onChange={onOnLeaveChange}
          className="accent-blue-600"
        />
        Leave of Absence Only
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={noLicenseOnly}
          onChange={onNoLicenseOnlyChange}
          className="accent-blue-600"
        />
        No License Assigned Only
      </label>

      <button
        onClick={onDownloadCSV}
        className="ml-auto px-4 py-2 rounded bg-green-500 text-white font-semibold shadow hover:bg-green-600 transition"
        disabled={filteredUsers.length === 0}
      >
        Download CSV
      </button>
    </div>
  );
};

export default UserFilters;