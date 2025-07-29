import React from "react";

// Simple CSV download utility
function toCsv(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = v => 
    (typeof v === "string" && (v.includes(",") || v.includes('"') || v.includes("\n")))
      ? `"${v.replace(/"/g, '""')}"`
      : v ?? "";
  const csvRows = [
    keys.join(","),
    ...rows.map(r => keys.map(k => escape(r[k])).join(","))
  ];
  return csvRows.join("\r\n");
}

export default function CsvExportButton({ data, filename = "export.csv", children }) {
  const handleExport = () => {
    const csv = toCsv(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <button
      className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-sm flex items-center gap-1"
      onClick={handleExport}
      title="Export filtered table as CSV"
      type="button"
    >
      {children || "Export CSV"}
    </button>
  );
}