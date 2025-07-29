import React from "react";
import { Eye, EyeOff, ChevronDown } from "lucide-react";

// Example default columns (keep in sync with Dashboard)
const DEFAULT_COLUMNS = [
  "name",
  "email",
  "status",
  "department",
  "jobTitle",
  "licensesDisplay",
  "lastSignIn",
  "domain"
];

const COLUMN_LABELS = {
  name: "Name",
  email: "Email",
  status: "Status",
  department: "Department",
  jobTitle: "Job Title",
  licensesDisplay: "Licenses",
  lastSignIn: "Last Sign-in",
  domain: "Domain"
  // Add more as needed
};

export default function AzureUserTable({
  users,
  loading,
  Pagination,
  visibleColumns,
  setVisibleColumns,
  allFields,
  columnLabels = COLUMN_LABELS
}) {
  // Columns for picker: sorted, only those with real data
  const columnOptions = React.useMemo(() => {
    const fieldSet = new Set(DEFAULT_COLUMNS);
    users.forEach(u => Object.keys(u).forEach(k => fieldSet.add(k)));
    return Array.from(fieldSet).sort();
  }, [users]);

  // Column Picker UI
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Helper: toggle column on/off
  function toggleColumn(col) {
    setVisibleColumns(cols =>
      cols.includes(col)
        ? cols.filter(c => c !== col)
        : [...cols, col]
    );
  }

  return (
    <div className="w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-0 overflow-x-auto border border-gray-100 dark:border-gray-800">
      {/* --- Column Picker Azure Style --- */}
      <div className="flex items-center justify-end px-3 pt-3">
        <div className="relative">
          <button
            onClick={() => setPickerOpen(v => !v)}
            className="flex items-center px-3 py-2 text-sm font-semibold rounded border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-800"
          >
            <ChevronDown size={16} className="mr-1" />
            Columns
          </button>
          {pickerOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-900 shadow-lg border border-gray-200 dark:border-gray-800 rounded-xl z-20 p-3">
              <div className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Show/Hide Columns</div>
              <div className="grid grid-cols-2 gap-1">
                {columnOptions.map(col => (
                  <label
                    key={col}
                    className="flex items-center gap-2 py-1 px-2 rounded hover:bg-blue-50 dark:hover:bg-blue-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col)}
                      onChange={() => toggleColumn(col)}
                      className="form-checkbox rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{columnLabels[col] || col}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="w-full mt-2 text-blue-600 dark:text-blue-200 text-xs font-bold py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-800"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
      {/* --- User Table --- */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-gray-900 dark:text-gray-100 border-separate border-spacing-y-0.5">
          <thead>
            <tr className="bg-gray-50 dark:bg-blue-950">
              {visibleColumns.map(col => (
                <th key={col} className="px-3 py-3 text-left font-semibold tracking-wide">{columnLabels[col] || col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length} className="text-center py-10 text-blue-400">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="text-center py-10 text-gray-400">
                  No users found for the selected filters.
                </td>
              </tr>
            ) : (
              users.map((u, i) => (
                <tr
                  key={u.id || i}
                  className="bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900 transition"
                >
                  {visibleColumns.map(col => (
                    <td key={col} className="px-3 py-3">
                      {u[col] || (Array.isArray(u[col]) && u[col].join(", "))}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="p-2">{Pagination && <Pagination />}</div>
    </div>
  );
}