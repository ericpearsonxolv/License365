import React, { useState, useMemo } from "react";
import ColumnPickerModal from "./ColumnPickerModal";
import CsvExportButton from "./CsvExportButton";

export default function SmartUserTable({
  data = [],
  columns = [],
  defaultVisible = [],
  filters = [],
  onFilter = () => {},
  title = "Users"
}) {
  const [visibleColumns, setVisibleColumns] = useState(defaultVisible.length ? defaultVisible : columns.map(c => c.id));
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState(columns[0]?.id || "");
  const [sortDir, setSortDir] = useState("asc");

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let rows = [...data];
    if (search) {
      rows = rows.filter(row =>
        visibleColumns.some(col =>
          ("" + (row[col] || "")).toLowerCase().includes(search.toLowerCase())
        )
      );
    }
    // Add filter support here if using filters[]
    if (sortCol) {
      rows.sort((a, b) => {
        let vA = a[sortCol], vB = b[sortCol];
        if (typeof vA === "string") vA = vA.toLowerCase();
        if (typeof vB === "string") vB = vB.toLowerCase();
        if (vA < vB) return sortDir === "asc" ? -1 : 1;
        if (vA > vB) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [data, visibleColumns, search, sortCol, sortDir]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            className="bg-slate-100 dark:bg-neutral-800 rounded px-2 py-1 text-xs"
            onClick={() => setShowPicker(true)}
          >
            Columns
          </button>
          <input
            className="border rounded px-2 py-1 text-sm"
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <CsvExportButton data={filteredData} filename={`${title}.csv`} />
        </div>
        {/* Add more controls as needed */}
      </div>
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-full text-sm border border-gray-300 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              {columns.filter(col => visibleColumns.includes(col.id)).map(col => (
                <th
                  key={col.id}
                  className="px-3 py-2 cursor-pointer"
                  onClick={() => {
                    setSortCol(col.id);
                    setSortDir(dir => (sortCol === col.id && dir === "asc" ? "desc" : "asc"));
                  }}
                >
                  {col.label}
                  {sortCol === col.id && (sortDir === "asc" ? " ▲" : " ▼")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => (
              <tr key={row.id || row.account_id || idx}>
                {columns.filter(col => visibleColumns.includes(col.id)).map(col => (
                  <td key={col.id} className="px-3 py-2">
                    {row[col.id] != null ? row[col.id] : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showPicker && (
        <ColumnPickerModal
          columns={columns}
          selectedColumns={visibleColumns}
          onChange={setVisibleColumns}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}