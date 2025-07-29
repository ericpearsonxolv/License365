import React from "react";

const opOptions = [
  { label: "Contains", value: "contains" },
  { label: "Equals", value: "eq" },
  { label: "Not Equals", value: "neq" },
  { label: "Is Empty", value: "is-empty" },
  { label: "Not Empty", value: "not-empty" },
  { label: "Date Before", value: "date-before" },
  { label: "Date After", value: "date-after" }
];

export default function AzureFilterBar({ allFields, fieldValues, filters, setFilters, downloadCSV, onColumnPicker }) {
  // Add new filter: pick first field with values if possible
  const handleAdd = () => {
    if (!allFields.length) return;
    const defaultField = allFields[0];
    setFilters([...filters, { field: defaultField, op: "eq", value: "" }]);
  };

  const handleChange = (idx, key, val) => {
    setFilters(filters.map((f, i) => (i === idx ? { ...f, [key]: val } : f)));
  };

  const handleRemove = (idx) => {
    setFilters(filters.filter((_, i) => i !== idx));
  };

  // Value selector: dropdown for fields with many values, text/date otherwise
  const ValueInput = ({ filter, idx }) => {
    const field = filter.field;
    const op = filter.op;
    const available = fieldValues?.[field] || [];
    if (
      (op === "eq" || op === "neq") &&
      Array.isArray(available) &&
      available.length > 0
    ) {
      return (
        <select
          className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
          value={filter.value}
          onChange={e => handleChange(idx, "value", e.target.value)}
        >
          <option value="">-- Select --</option>
          {available.map((v) => (
            <option key={v} value={v}>
              {v?.toString()}
            </option>
          ))}
        </select>
      );
    }
    if (op.startsWith("date-")) {
      return (
        <input
          type="date"
          className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
          value={filter.value || ""}
          onChange={e => handleChange(idx, "value", e.target.value)}
        />
      );
    }
    return (
      <input
        className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
        value={filter.value || ""}
        onChange={e => handleChange(idx, "value", e.target.value)}
        placeholder="Value"
      />
    );
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-900 p-4 rounded-xl shadow flex flex-col gap-3 mb-6">
      <div className="flex flex-wrap items-center gap-4 w-full">
        <span className="font-semibold text-base text-gray-800 dark:text-gray-100">
          Add Filter:
        </span>
        <button
          onClick={handleAdd}
          className="px-3 py-1 rounded bg-blue-600 text-white font-bold hover:bg-blue-800 transition"
          type="button"
          disabled={allFields.length === 0}
        >
          +
        </button>
        <button
          onClick={downloadCSV}
          className="px-3 py-1 rounded bg-green-600 text-white font-semibold hover:bg-green-700 transition ml-2"
          type="button"
        >
          Export CSV
        </button>
        {onColumnPicker && (
          <button
            onClick={onColumnPicker}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 font-semibold border border-gray-300 dark:border-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 transition ml-2"
            type="button"
          >
            Manage Columns
          </button>
        )}
      </div>
      {filters.length === 0 && (
        <div className="text-gray-400 py-3">No filters applied. Showing all users.</div>
      )}
      {filters.map((f, idx) => (
        <div key={idx} className="flex flex-wrap items-center gap-2 py-2">
          <select
            className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
            value={f.field}
            onChange={e => handleChange(idx, "field", e.target.value)}
          >
            {allFields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
          <select
            className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
            value={f.op}
            onChange={e => handleChange(idx, "op", e.target.value)}
          >
            {opOptions.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          {!["is-empty", "not-empty"].includes(f.op) && (
            <ValueInput filter={f} idx={idx} />
          )}
          <button
            onClick={() => handleRemove(idx)}
            className="ml-2 px-2 py-1 rounded bg-red-600 text-white font-bold hover:bg-red-800 transition"
            type="button"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}