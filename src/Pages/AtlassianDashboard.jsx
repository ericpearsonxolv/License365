import React, { useState, useEffect, useMemo } from "react";
import Header from "../components/Header";
import Gauge from "../components/Gauge";
import ColumnPickerModal from "../components/ColumnPickerModal";
import ATLASSIAN_COLUMNS from "../config/tableColumns";
import { FiFilter, FiDownload, FiCopy } from "react-icons/fi";

// Default page size for the table. Can be changed by the user via dropdown.
const DEFAULT_PAGE_SIZE = 100;

// Grab just the IDs for table state, but keep config central!
const DEFAULT_COLUMNS = ATLASSIAN_COLUMNS.map(col => col.id);

function getStatus(u) {
  return (u.isActive !== false && u.active !== false && u.account_status !== "closed" && u.account_status !== "inactive")
    ? "Active"
    : "Inactive";
}

function formatDate(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d)) return dt;
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

function extractDomain(email) {
  if (!email) return "";
  return email.split("@")[1] || "";
}

export default function AtlassianDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  // Page size state; defaults to DEFAULT_PAGE_SIZE but can be changed by the user
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  // Search/filter state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBillable, setFilterBillable] = useState("all");
  const [filterDomain, setFilterDomain] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterPotentialWaste, setFilterPotentialWaste] = useState(false);

  // Allow user to configure inactivity threshold (in months) for potential waste
  const [thresholdMonths, setThresholdMonths] = useState(6);

  // Dynamic columns (order and visibility by ID, config-driven)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = localStorage.getItem("atlassianCols");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every(col => DEFAULT_COLUMNS.includes(col))) return parsed;
      }
    } catch {}
    return DEFAULT_COLUMNS.slice(0, 6);
  });

  useEffect(() => {
    localStorage.setItem("atlassianCols", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    setLoading(true);
    fetch("/api/GetAtlassianUsers")
      .then(r => {
        if (!r.ok) throw new Error(`API error: ${r.statusText}`);
        return r.json();
      })
      .then(data => {
        const now = new Date();
        // Annotate users with monthsInactive; potentialWaste will be computed via effect
        const usersWithInactive = (Array.isArray(data.users) ? data.users : []).map(u => {
          const lastActive = u.last_active ? new Date(u.last_active) : null;
          const monthsInactive = lastActive
            ? (now - lastActive) / (1000 * 60 * 60 * 24 * 30.44)
            : 99;
          return {
            ...u,
            monthsInactive,
            // Set default potentialWaste based on thresholdMonths (initial)
            potentialWaste: monthsInactive >= thresholdMonths
          };
        });
        setUsers(usersWithInactive);
        setLoading(false);
      })
      .catch(err => {
        setFetchError(err.message || "Failed to load users");
        setLoading(false);
      });
  }, []);

  // Recompute potentialWaste on thresholdMonths change
  useEffect(() => {
    setUsers(prev =>
      prev.map(u => ({
        ...u,
        potentialWaste: u.monthsInactive >= thresholdMonths
      }))
    );
  }, [thresholdMonths]);

  // Build dynamic filter values
  const allDomains = useMemo(() => [...new Set((users || []).map(u => extractDomain(u.email)).filter(Boolean))], [users]);
  const allProducts = useMemo(
    () => [...new Set((users || []).flatMap(u =>
      (u.product_access || []).map(p => p.name || p.key || "")
    ).filter(Boolean))],
    [users]
  );

  // Advanced filtering
  const filteredUsers = useMemo(() => {
    let filtered = Array.isArray(users) ? users : [];
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(u =>
        (u.displayName || u.display_name || u.name || "").toLowerCase().includes(query) ||
        (u.email || u.emailAddress || "").toLowerCase().includes(query) ||
        (u.account_id || u.id || "").toLowerCase().includes(query)
      );
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter(u => getStatus(u) === filterStatus);
    }
    if (filterBillable !== "all") {
      filtered = filtered.filter(u =>
        filterBillable === "yes" ? u.access_billable === true : u.access_billable === false
      );
    }
    if (filterDomain !== "all") {
      filtered = filtered.filter(u => extractDomain(u.email) === filterDomain);
    }
    if (filterProduct !== "all") {
      filtered = filtered.filter(u =>
        (u.product_access || []).some(p => p.name === filterProduct || p.key === filterProduct)
      );
    }
    if (filterPotentialWaste) {
      filtered = filtered.filter(u => u.potentialWaste);
    }
    return filtered;
  }, [users, search, filterStatus, filterBillable, filterDomain, filterProduct, filterPotentialWaste]);

  // --- Stats ---
  const statusCounts = useMemo(() => ({
    total: users.length,
    active: users.filter(u => getStatus(u) === "Active").length,
    inactive: users.filter(u => getStatus(u) === "Inactive").length,
  }), [users]);

  const potentialWasteCount = useMemo(
    () => users.filter(u => u.potentialWaste).length,
    [users]
  );
  const wastePercent = useMemo(
    () => users.length > 0 ? potentialWasteCount / users.length : 0,
    [potentialWasteCount, users]
  );

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIdx, startIdx + pageSize);
  }, [filteredUsers, currentPage, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filteredUsers, totalPages, currentPage]);

  // --- CSV Export ---
  function downloadCSV() {
    if (!filteredUsers.length) return;
    const rows = filteredUsers.map(user =>
      visibleColumns.map(colId => {
        let v = user[colId];
        if (Array.isArray(v)) v = v.join("; ");
        if (typeof v === "object" && v !== null) v = JSON.stringify(v);
        return `"${(v || "").toString().replace(/"/g, '""')}"`;
      }).join(",")
    );
    const headerLabels = visibleColumns.map(colId => {
      const col = ATLASSIAN_COLUMNS.find(c => c.id === colId);
      return col?.label || colId;
    });
    const csv = [headerLabels.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlassian_users_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  }

  // --- Table Cell Rendering ---
  function renderCell(u, colId) {
    switch (colId) {
      case "displayName":
        return u.displayName || u.display_name || u.name || "";
      case "email":
        return u.email || u.emailAddress || "";
      case "status":
        return (
          <span
            className={getStatus(u) === "Active"
              ? "text-green-700 dark:text-green-300 font-semibold"
              : "text-yellow-700 dark:text-yellow-300 font-semibold"
            }
            aria-label={getStatus(u)}
          >
            ● <span className="sr-only">{getStatus(u)}</span>
            {getStatus(u)}
          </span>
        );
      case "accountId":
        return u.account_id || u.id || "";
      case "account_type":
        return u.account_type || "";
      case "account_status":
        return u.account_status || "";
      case "access_billable":
        return u.access_billable ? "Yes" : "No";
      case "product_access":
        return (u.product_access || []).map(p => p.name || p.key).join(", ");
      case "last_active":
        return formatDate(u.last_active);
      case "potentialWaste":
        return u.potentialWaste
          ? <span className="text-red-600 dark:text-red-400 font-semibold">Yes</span>
          : <span className="text-gray-400 dark:text-gray-600">No</span>;
      default:
        return u[colId] || "";
    }
  }

  // --- Pagination Controls ---
  function Pagination() {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 my-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-blue-200 dark:hover:bg-blue-800 transition"
        >
          Prev
        </button>
        <span className="text-gray-900 dark:text-gray-100">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-blue-200 dark:hover:bg-blue-800 transition"
        >
          Next
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 to-blue-100 dark:from-neutral-900 dark:to-neutral-800 transition-colors">
      <Header />

      <div className="max-w-5xl mx-auto my-8 bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl p-8 flex flex-col gap-8 items-center">
        <h1 className="text-4xl font-bold text-blue-700 dark:text-blue-200 text-center mb-2">
          Atlassian Dashboard
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-300 text-center mb-4">
          View and analyze your Atlassian user licensing, activity status, and more.
        </p>

        {/* KPI Row */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-4 gap-6 mb-6 text-center">
          <div className="bg-card rounded-2xl shadow p-6 flex flex-col items-center">
            <span className="font-semibold text-lg text-gray-900 dark:text-white">Total Users</span>
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{statusCounts.total}</span>
          </div>
          <div className="bg-card rounded-2xl shadow p-6 flex flex-col items-center">
            <span className="font-semibold text-lg text-gray-900 dark:text-white">Active</span>
            <span className="text-2xl font-bold text-green-700 dark:text-green-300">{statusCounts.active}</span>
          </div>
          <div className="bg-card rounded-2xl shadow p-6 flex flex-col items-center">
            <span className="font-semibold text-lg text-gray-900 dark:text-white">Inactive</span>
            <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{statusCounts.inactive}</span>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow p-6 flex flex-col items-center min-w-[180px] border-2 border-red-100 dark:border-red-700">
            <span className="font-semibold text-lg text-gray-900 dark:text-white">Potential Waste</span>
            <span className="text-2xl font-bold text-red-600 dark:text-red-300">{potentialWasteCount}</span>
            <div className="w-full mt-2">
              <Gauge percent={wastePercent} width={120} label="Waste %" />
            </div>
            <button
              className="mt-3 px-3 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 font-semibold shadow hover:scale-105 transition text-xs"
              onClick={() => setFilterPotentialWaste(f => !f)}
            >
              {filterPotentialWaste ? "Show All Users" : "Filter Potential Waste"}
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-6 items-center justify-between mb-2">
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-2 py-1 border rounded text-sm dark:bg-neutral-800 dark:border-gray-700"
              placeholder="🔍 Search name/email/id…"
              style={{ minWidth: 200 }}
            />
            <select className="px-2 py-1 border rounded text-sm dark:bg-neutral-800 dark:border-gray-700"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              title="Status"
            >
              <option value="all">Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <select className="px-2 py-1 border rounded text-sm dark:bg-neutral-800 dark:border-gray-700"
              value={filterBillable}
              onChange={e => setFilterBillable(e.target.value)}
              title="Billable"
            >
              <option value="all">Billable</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <select className="px-2 py-1 border rounded text-sm dark:bg-neutral-800 dark:border-gray-700"
              value={filterDomain}
              onChange={e => setFilterDomain(e.target.value)}
              title="Email Domain"
            >
              <option value="all">Email Domain</option>
              {allDomains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="px-2 py-1 border rounded text-sm dark:bg-neutral-800 dark:border-gray-700"
              value={filterProduct}
              onChange={e => setFilterProduct(e.target.value)}
              title="Product Access"
            >
              <option value="all">Product</option>
              {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Potential waste threshold selector */}
            <div className="flex items-center gap-1 text-sm ml-1">
              <label htmlFor="threshold-input" className="text-gray-700 dark:text-gray-300">Waste threshold (mo):</label>
              <input
                id="threshold-input"
                type="number"
                min="1"
                max="24"
                value={thresholdMonths}
                onChange={e => setThresholdMonths(parseInt(e.target.value) || 1)}
                className="w-16 px-1 py-1 border rounded dark:bg-neutral-800 dark:border-gray-700 text-center"
                title="Number of months inactivity before classifying as potential waste"
              />
            </div>

            {/* Clear filters button: show only if some filter/search active */}
            {(search.trim() ||
              filterStatus !== "all" ||
              filterBillable !== "all" ||
              filterDomain !== "all" ||
              filterProduct !== "all" ||
              filterPotentialWaste ||
              currentPage !== 1) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterStatus("all");
                  setFilterBillable("all");
                  setFilterDomain("all");
                  setFilterProduct("all");
                  setFilterPotentialWaste(false);
                  setCurrentPage(1);
                }}
                className="px-3 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 text-sm ml-1 hover:bg-red-200 dark:hover:bg-red-800 transition"
                title="Clear all filters and search"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
                const emails = (filteredUsers || []).map(u => u.email).filter(Boolean).join(";");
                navigator.clipboard?.writeText(emails);
                alert("All emails copied to clipboard!");
              }}
              className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-sm flex items-center gap-1" title="Copy all emails"
            >
              <FiCopy /> Copy Emails
            </button>
            <button onClick={downloadCSV} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-sm flex items-center gap-1" title="Export CSV">
              <FiDownload className="inline" /> Export CSV
            </button>
            <button
              onClick={() => setShowColumnsModal(true)}
              className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-sm font-medium shadow flex items-center gap-1"
              title="Pick columns"
            >
              <FiFilter /> Columns
            </button>

            {/* Page size selector */}
            <select
              value={pageSize}
              onChange={e => setPageSize(parseInt(e.target.value) || DEFAULT_PAGE_SIZE)}
              className="px-2 py-1 border rounded text-sm dark:bg-neutral-800 dark:border-gray-700"
              title="Rows per page"
            >
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={200}>200 / page</option>
            </select>
          </div>
        </div>

        {/* User Table */}
        <div className="w-full overflow-x-auto rounded-2xl shadow bg-white dark:bg-neutral-900">
          {loading ? (
            <div className="py-8 text-lg text-center text-gray-500 dark:text-gray-300">Loading Atlassian users…</div>
          ) : fetchError ? (
            <div className="py-8 text-red-500 text-center">{fetchError}</div>
          ) : (filteredUsers || []).length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-300">No Atlassian users found.</div>
          ) : (
            <>
              <table className="min-w-full border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    {visibleColumns.map(colId => {
                      const col = ATLASSIAN_COLUMNS.find(c => c.id === colId);
                      return (
                        <th
                          key={colId}
                          className="px-3 py-2 text-left cursor-pointer select-none"
                        >
                          {col?.label || colId}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(pagedUsers || []).map(u => (
                    <tr
                      key={u.account_id || u.id}
                      className={
                        "border-t border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 transition" +
                        (u.potentialWaste ? " bg-red-50 dark:bg-red-900/40" : "")
                      }
                    >
                      {visibleColumns.map(colId => (
                        <td key={colId} className="px-3 py-2">
                          {renderCell(u, colId)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination />
            </>
          )}
        </div>
      </div>

      {/* Column Picker Modal */}
      <ColumnPickerModal
        open={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        columnsConfig={ATLASSIAN_COLUMNS}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
      />
    </div>
  );
}