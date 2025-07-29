import React, { useState, useMemo, useCallback } from "react";

// Guess column type (date, number, string)
function detectType(values = []) {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    if (!isNaN(Date.parse(v))) return "date";
    if (!isNaN(Number(v)) && typeof v !== "boolean") return "number";
    break;
  }
  return "string";
}

// Comparator based on type
function getComparator(type, field) {
  return (a, b) => {
    let va = a[field], vb = b[field];
    if (va === undefined || va === null || va === "") return 1;
    if (vb === undefined || vb === null || vb === "") return -1;
    if (Array.isArray(va)) va = va.join("; ");
    if (Array.isArray(vb)) vb = vb.join("; ");
    switch (type) {
      case "date":
        return new Date(va) - new Date(vb);
      case "number":
        return Number(va) - Number(vb);
      default:
        return String(va).localeCompare(String(vb), undefined, { sensitivity: "base" });
    }
  };
}

export default function AdvancedUserTable({
  users = [],
  visibleColumns = [],
  columnLabels = {},
  loading,
  Pagination
}) {
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Memoize detected column types
  const columnTypes = useMemo(() => {
    const types = {};
    for (const col of visibleColumns) {
      const sample = users.map(u => u[col]).filter(v => v !== undefined && v !== null && v !== "");
      types[col] = detectType(sample);
    }
    return types;
  }, [users, visibleColumns]);

  // Memoize sort handler (React best practice)
  const handleSort = useCallback((col) => {
    setSortConfig((prev) => {
      if (prev.key === col) {
        // Toggle direction
        return { key: col, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key: col, direction: "asc" };
    });
  }, []);

  // Sorted user data (memoized)
  const sortedUsers = useMemo(() => {
    if (!sortConfig.key) return users;
    const type = columnTypes[sortConfig.key];
    const comparator = getComparator(type, sortConfig.key);
    const arr = [...users];
    arr.sort(comparator);
    if (sortConfig.direction === "desc") arr.reverse();
    return arr;
  }, [users, sortConfig, columnTypes]);

  if (loading) {
    return (
      <div className="w-full rounded-2xl shadow bg-white dark:bg-neutral-900 text-center py-10 font-semibold text-gray-700 dark:text-gray-100">
        Loading users…
      </div>
    );
  }
  if (!users || users.length === 0) {
    return (
      <div className="w-full rounded-2xl shadow bg-white dark:bg-neutral-900 text-center py-10 text-gray-400">
        No users found for the selected filters.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl shadow bg-white dark:bg-neutral-900">
      <table className="min-w-full border border-gray-300 dark:border-gray-700 text-xs text-center">
        <thead className="bg-gray-200 dark:bg-gray-700 sticky top-0 z-10">
          <tr>
            {visibleColumns.map((field) => {
              const sorted = sortConfig.key === field;
              const arrow = sorted
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : "";
              return (
                <th
                  key={field}
                  scope="col"
                  aria-sort={
                    sorted ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none"
                  }
                  className={`px-4 py-2 whitespace-nowrap font-semibold text-sm text-gray-900 dark:text-gray-100 cursor-pointer select-none hover:underline transition`}
                  title={`Sort by ${columnLabels[field] || field}`}
                  onClick={() => handleSort(field)}
                  style={{ userSelect: "none" }}
                >
                  <span className="flex items-center gap-1 justify-center">
                    {columnLabels[field] || field}
                    <span className="text-blue-500 dark:text-blue-300 text-xs">{arrow}</span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user, idx) => (
            <tr
              key={user.id || idx}
              className={`border-t border-gray-300 dark:border-gray-600 ${
                idx % 2 === 0
                  ? "bg-white dark:bg-gray-900"
                  : "bg-gray-50 dark:bg-gray-800"
              } hover:bg-blue-50 dark:hover:bg-blue-950 transition`}
            >
              {visibleColumns.map(field => {
                let value = user[field];
                if (Array.isArray(value)) value = value.join("; ");
                if (typeof value === "object" && value !== null)
                  value = JSON.stringify(value);
                return (
                  <td
                    key={field}
                    className="px-4 py-2 whitespace-nowrap max-w-[220px] truncate text-gray-800 dark:text-gray-100"
                    title={value !== undefined && value !== null && value !== "" ? String(value) : ""}
                  >
                    {value !== undefined && value !== null && value !== "" ? value : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {Pagination && <Pagination />}
    </div>
  );
}