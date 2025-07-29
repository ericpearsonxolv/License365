import React from "react";
import { X } from "lucide-react";

const OPERATORS = {
  contains: "Contains",
  eq: "Equals",
  neq: "Not equals",
  "is-empty": "Is empty",
  "not-empty": "Is not empty",
  "date-before": "Date before",
  "date-after": "Date after",
};

const isDateField = (field) =>
  /date|timestamp|signIn/i.test(field);

function AzureFilterBar({
  allFields,
  fieldValues,
  filters,
  setFilters,
  downloadCSV,
  searchTerm,
  setSearchTerm,
  onClearFilters,
}) {
  // Add new filter (default: first non-selected field)
  function addFilter() {
    const usedFields = filters.map((f) => f.field);
    const avail = allFields.filter((f) => !usedFields.includes(f));
    setFilters([
      ...filters,
      {
        field: avail[0] || allFields[0],
        op: "contains",
        value: "",
      },
    ]);
  }

  // Update a filter
  function updateFilter(idx, prop, val) {
    setFilters((prev) =>
      prev.map((f, i) =>
        i === idx ? { ...f, [prop]: val } : f
      )
    );
  }

  // Remove a filter
  function removeFilter(idx) {
    setFilters((prev) => prev.filter((_, i) => i !== idx));
  }

  // Clear all filters
  function clearAll() {
    if (onClearFilters) onClearFilters();
  }

  return (
    <div className="w-full flex flex-col md:flex-row md:items-end gap-3 md:gap-4 py-2 px-0 bg-transparent border-0">
      <div className="flex flex-wrap gap-3 items-center flex-1">
        {filters.map((f, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-neutral-800 shadow border border-gray-200 dark:border-neutral-700"
            style={{ minWidth: 250 }}
          >
            {/* Field dropdown */}
            <select
              className="bg-white dark:bg-neutral-900 border border-gray-300 dark:border-gray-700 focus:outline-none font-semibold text-gray-800 dark:text-gray-100 py-1 px-1 rounded transition"
              value={f.field}
              onChange={(e) =>
                updateFilter(idx, "field", e.target.value)
              }
              style={{ minWidth: 90, maxWidth: 160 }}
            >
              {allFields.map((field) => (
                <option key={field} value={field}>
                  {field.charAt(0).toUpperCase() +
                    field.slice(1)}
                </option>
              ))}
            </select>

            {/* Operator dropdown */}
            <select
              className="bg-white dark:bg-neutral-900 border border-gray-300 dark:border-gray-700 focus:outline-none text-gray-700 dark:text-gray-100 py-1 px-1 rounded transition"
              value={f.op}
              onChange={(e) =>
                updateFilter(idx, "op", e.target.value)
              }
              style={{ minWidth: 100, maxWidth: 140 }}
            >
              {Object.entries(OPERATORS).map(([k, label]) => {
                if (
                  (k === "date-before" || k === "date-after") &&
                  !isDateField(f.field)
                )
                  return null;
                return (
                  <option key={k} value={k}>
                    {label}
                  </option>
                );
              })}
            </select>

            {/* Value dropdown or input, if needed */}
            {!(f.op === "is-empty" || f.op === "not-empty") && (
              isDateField(f.field) ? (
                <input
                  type="date"
                  className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 focus:outline-none transition"
                  value={f.value}
                  onChange={(e) => updateFilter(idx, "value", e.target.value)}
                  style={{ minWidth: 120 }}
                />
              ) : (
                <select
                  className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 focus:outline-none transition"
                  value={f.value}
                  onChange={(e) => updateFilter(idx, "value", e.target.value)}
                  style={{ minWidth: 120 }}
                >
                  <option value="">Select value…</option>
                  {(fieldValues[f.field] || []).map((v) => (
                    <option key={v} value={v}>
                      {String(v)}
                    </option>
                  ))}
                </select>
              )
            )}

            {/* Remove filter button */}
            <button
              type="button"
              aria-label="Remove filter"
              className="ml-2 rounded-full p-1 hover:bg-red-100 dark:hover:bg-red-900 text-red-500"
              onClick={() => removeFilter(idx)}
              tabIndex={0}
            >
              <X size={16} />
            </button>
          </div>
        ))}

        {/* Add filter */}
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold shadow hover:bg-blue-100 dark:hover:bg-blue-800 border border-blue-200 dark:border-blue-700 transition"
          onClick={addFilter}
        >
          <span className="text-lg font-bold">+</span>
          Add Filter
        </button>

        {/* Search box */}
        <input
          type="text"
          aria-label="Search users"
          placeholder="Search by name, email, department..."
          value={searchTerm || ""}
          onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
          className="ml-2 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 text-sm shadow focus:outline-none"
          style={{ minWidth: 200, flexGrow: 1, maxWidth: 240 }}
        />
      </div>
      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-2 md:mt-0">
        {filters.length > 0 && (
          <button
            type="button"
            aria-label="Clear all filters"
            className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 font-semibold shadow hover:bg-red-100 dark:hover:bg-red-800 border border-red-200 dark:border-red-700 transition"
            onClick={clearAll}
          >
            Clear Filters
          </button>
        )}
        <button
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-400 text-white font-semibold shadow hover:scale-105 transition disabled:opacity-60"
          onClick={downloadCSV}
          type="button"
          style={{
            background:
              "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
          }}
        >
          Download CSV
        </button>
      </div>
    </div>
  );
}

export default AzureFilterBar;