import React, { useState, useEffect, useMemo } from "react";
import Header from "./components/Header";
import UserCharts from "./components/UserCharts";
import Gauge from "./components/Gauge";
import AzureFilterBar from "./components/AzureFilterBar";
import AdvancedUserTable from "./components/AdvancedUserTable";
import ColumnPickerModal from "./components/ColumnPickerModal";
import TrendsGraph from "./components/TrendsGraph";
import skuCosts from "./assets/MS365_SKU_costs";
import { getSkuDisplayName } from "./Utils/getSkuDisplayName";
import { formatCurrency, formatNumber } from "./Utils/formatters";

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
};

function normalizeUser(raw, skus) {
  const assignedLicenses = (raw.assignedLicenses || []).map(l => l.skuId);
  const licenseSkuIds = assignedLicenses.length ? assignedLicenses : (raw.licenses || []);
  return {
    ...raw,
    licenses: licenseSkuIds,
    name: raw.displayName || raw.name || "",
    email: raw.mail || raw.userPrincipalName,
    status: raw.accountEnabled === false ? "Inactive" : "Active",
    domain: (raw.mail || raw.userPrincipalName || "").split("@")[1] || "",
    lastSignIn: raw.lastSignIn || raw.signInSessionsValidFromDateTime || raw.signInActivity?.lastSignInDateTime || "",
    department: raw.department || "",
    jobTitle: raw.jobTitle || "",
    licensesDisplay: (licenseSkuIds || []).map(skuId => getSkuDisplayName(skuId, skus)).join(", ")
  };
}

async function fetchAllUsersAndSkus() {
  const usersRes = await fetch(`/api/GetCurrentUsers`);
  if (!usersRes.ok) throw new Error(`API error: ${usersRes.statusText}`);
  const usersData = await usersRes.json();
  const users = Array.isArray(usersData) ? usersData : (usersData.users || usersData.value || []);
  const skus = Object.entries(skuCosts).map(([skuId]) => ({ skuId }));
  return { users, skus };
}

function getUserPotentialWasteMonthly(user) {
  if (!(user.licenses || []).length) return 0;
  const now = new Date();
  const lastSignIn = user.lastSignIn ? new Date(user.lastSignIn) : null;
  const monthsInactive = lastSignIn
    ? (now - lastSignIn) / (1000 * 60 * 60 * 24 * 30.44)
    : 99;
  if (monthsInactive >= 3 && user.accountEnabled) {
    return (user.licenses || []).reduce((s, sku) => s + (skuCosts[sku] || 0), 0);
  }
  return 0;
}

const USERS_PER_PAGE = 100;

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState([]);
  const [trends, setTrends] = useState([]); // PATCH: For new trends graph
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [filters, setFilters] = useState([]);
  // Added search term state for global search box
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [columnModalOpen, setColumnModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAllUsersAndSkus()
      .then(({ users, skus }) => {
        if (mounted) {
          setUsers(users.map(u => normalizeUser(u, skus)));
          setSkus(skus);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { mounted = false; };
  }, []);
  useEffect(() => { setCurrentPage(1); }, [filters]);

  useEffect(() => {
    fetch("/api/GetUserSnapshots")
      .then(r => r.json())
      .then(data => {
        setSnapshots(data.snapshots || []);
        setTrends(data.trends || []); // PATCH: Pull trends array if present
      })
      .catch(() => {
        setSnapshots([]);
        setTrends([]);
      });
  }, []);

  async function handleChatbotSubmit(e) {
    e.preventDefault();
    setChatError(null);
    setChatResponse("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/GetLicenseRecommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: chatPrompt })
      });
      if (!res.ok) {
        throw new Error((await res.text()) || "API error");
      }
      const data = await res.json();
      setChatResponse(data.recommendation || "No recommendation found.");
    } catch (err) {
      setChatError(err.message || "Failed to get recommendation.");
    } finally {
      setChatLoading(false);
    }
  }

  const allFields = useMemo(() => {
    const set = new Set(DEFAULT_COLUMNS);
    users.forEach(u => Object.keys(u).forEach(k => set.add(k)));
    return Array.from(set);
  }, [users]);

  const fieldValues = useMemo(() => {
    const result = {};
    allFields.forEach(field => {
      const values = users.map(u => u[field]).filter(v => v !== undefined && v !== null && v !== "");
      result[field] = Array.from(new Set(values.map(val => (typeof val === "string" ? val.trim() : val)))).sort();
    });
    return result;
  }, [allFields, users]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Global search: check searchTerm across key fields
      if (searchTerm && searchTerm.trim() !== "") {
        const q = searchTerm.trim().toLowerCase();
        const searchFields = [
          user.name,
          user.email,
          user.department,
          user.jobTitle,
          user.domain
        ].map(v => (v || "").toString().toLowerCase());
        if (!searchFields.some(fieldVal => fieldVal.includes(q))) {
          return false;
        }
      }
      // Apply advanced filters
      for (const f of filters) {
        const val = user[f.field];
        switch (f.op) {
          case "contains":
            if (!val || !String(val).toLowerCase().includes((f.value || "").toLowerCase())) return false;
            break;
          case "eq":
            if (val !== f.value) return false;
            break;
          case "neq":
            if (val === f.value) return false;
            break;
          case "is-empty":
            if (val && (Array.isArray(val) ? val.length > 0 : String(val).trim() !== "")) return false;
            break;
          case "not-empty":
            if (!val || (Array.isArray(val) ? val.length === 0 : String(val).trim() === "")) return false;
            break;
          case "date-before":
            if (!val || new Date(val) >= new Date(f.value)) return false;
            break;
          case "date-after":
            if (!val || new Date(val) <= new Date(f.value)) return false;
            break;
          default:
            break;
        }
      }
      return true;
    });
  }, [users, filters, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const pagedUsers = useMemo(() => {
    const startIdx = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(startIdx, startIdx + USERS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const statusCounts = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === "Active").length,
    inactive: users.filter(u => u.status === "Inactive").length,
  }), [users]);

  const monthlyTotalSpend = useMemo(() => (
    users.reduce(
      (sum, u) =>
        sum +
        (u.licenses || []).reduce((s, sku) => s + (skuCosts[sku] || 0), 0),
      0
    )
  ), [users]);

  const annualTotalSpend = useMemo(() => monthlyTotalSpend * 12, [monthlyTotalSpend]);
  const monthlyWastedLicenseSpend = useMemo(() => users.reduce((sum, u) => sum + getUserPotentialWasteMonthly(u), 0), [users]);
  const annualWastedLicenseSpend = useMemo(() => monthlyWastedLicenseSpend * 12, [monthlyWastedLicenseSpend]);
  const wastePercent = useMemo(
    () => (annualTotalSpend > 0 && isFinite(annualTotalSpend)
      ? Math.min(1, annualWastedLicenseSpend / annualTotalSpend)
      : 0
    ),
    [annualTotalSpend, annualWastedLicenseSpend]
  );

  const skuAnalytics = useMemo(() => {
    const result = {};
    skus.forEach(sku => {
      result[sku.skuId] = {
        skuId: sku.skuId,
        name: getSkuDisplayName(sku.skuId, skus),
        assignedCount: 0,
        totalAnnualCost: 0,
        wasteCount: 0,
        totalWaste: 0
      };
    });
    users.forEach(user => {
      const now = new Date();
      const lastSignIn = user.lastSignIn ? new Date(user.lastSignIn) : null;
      const monthsInactive = lastSignIn
        ? (now - lastSignIn) / (1000 * 60 * 60 * 24 * 30.44)
        : 99;
      (user.licenses || []).forEach(skuId => {
        if (!result[skuId]) {
          result[skuId] = {
            skuId,
            name: getSkuDisplayName(skuId, skus),
            assignedCount: 0,
            totalAnnualCost: 0,
            wasteCount: 0,
            totalWaste: 0
          };
        }
        result[skuId].assignedCount += 1;
        result[skuId].totalAnnualCost += (skuCosts[skuId] || 0) * 12;
        if (monthsInactive >= 3 && user.accountEnabled) {
          result[skuId].wasteCount += 1;
          result[skuId].totalWaste += (skuCosts[skuId] || 0) * 12;
        }
      });
    });
    return Object.values(result)
      .filter(x => x.assignedCount > 0)
      .sort((a, b) => b.totalAnnualCost - a.totalAnnualCost);
  }, [users, skus]);

  const handlePotentialWasteKpiClick = () => {
    setFilters([
      ...filters.filter(f => f.field !== "potentialWaste"),
      { field: "potentialWaste", op: "eq", value: true }
    ]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function downloadCSV() {
    if (!filteredUsers.length) return;
    const headers = visibleColumns;
    const rows = filteredUsers.map(user =>
      headers.map(k => {
        let v = user[k];
        if (k === "licensesDisplay") v = user.licensesDisplay;
        if (Array.isArray(v)) v = v.join("; ");
        if (typeof v === "object" && v !== null) v = JSON.stringify(v);
        return `"${(v || "").toString().replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv = [headers.map(h => COLUMN_LABELS[h] || h).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user_license_report_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  }

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

      {/* --- Azure OpenAI Chatbot (License AI Agent) --- */}
      <div className="w-full max-w-3xl mx-auto mt-10 mb-8 bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl p-8 flex flex-col gap-4">
        <form className="flex flex-col gap-4" onSubmit={handleChatbotSubmit}>
          <label htmlFor="license-agent-prompt" className="font-semibold text-lg text-blue-700 dark:text-blue-200">
            Ask <span className="font-bold text-indigo-700 dark:text-indigo-200">License AI Agent</span>
          </label>
          <textarea
            id="license-agent-prompt"
            className="w-full min-h-[60px] p-3 rounded-xl border border-blue-200 dark:border-blue-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
            placeholder="E.g. 'What licenses are underused?', 'How do I optimize spend?', 'Who is inactive with an E5?'"
            value={chatPrompt}
            onChange={e => setChatPrompt(e.target.value)}
            disabled={chatLoading}
            rows={3}
            required
          />
          <div className="flex justify-end items-center gap-2">
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold shadow hover:scale-105 transition disabled:opacity-60"
              disabled={chatLoading || !chatPrompt.trim()}
            >
              {chatLoading ? "Thinking..." : "Ask Agent"}
            </button>
            {chatError && <span className="text-red-500 text-sm ml-3">{chatError}</span>}
          </div>
        </form>
        {chatResponse && (
          <div className="mt-4 p-4 bg-card rounded-xl shadow text-lg whitespace-pre-line border border-primary relative text-gray-900 dark:text-white">
            <button
              aria-label="Clear License Agent Response"
              className="absolute top-2 right-3 text-gray-400 hover:text-red-500 text-lg font-bold"
              onClick={() => setChatResponse("")}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              &times;
            </button>
            <strong>License AI Agent Response:</strong>
            <br />
            {chatResponse}
          </div>
        )}
      </div>

      {/* --- License/User Trends Graph --- */}
      <div className="w-full max-w-7xl mx-auto mt-4 mb-8">
        <TrendsGraph trends={trends} />
      </div>

      {/* --- KPIs, Gauge, and Tiles Row --- */}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 flex flex-col items-center">
        <div className="w-full flex flex-col md:flex-row items-stretch justify-between gap-8 my-8">
          {/* KPI 1: Total Spend */}
          <div className="flex-1 bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl p-6 flex flex-col items-center justify-center text-center min-w-[220px] max-w-sm mx-auto transition hover:shadow-blue-200 dark:hover:shadow-blue-700">
            <div className="text-gray-500 dark:text-gray-300 text-base mb-1">Total License Spend (annual)</div>
            <div className="text-4xl font-bold text-blue-700 dark:text-blue-200">{formatCurrency(annualTotalSpend)}</div>
          </div>
          {/* KPI 2: License Waste Gauge */}
          <div className="flex-1 flex flex-col items-center justify-center mx-auto">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl flex flex-col items-center p-6 min-w-[220px] max-w-xs mx-auto">
              <Gauge percent={wastePercent} width={200} label="License Waste" />
            </div>
          </div>
          {/* KPI 3: Potential Waste */}
          <div
            className="flex-1 bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl p-6 flex flex-col items-center justify-center text-center min-w-[220px] max-w-sm mx-auto cursor-pointer border-2 border-red-100 dark:border-red-700 hover:shadow-lg hover:scale-105 transition"
            onClick={handlePotentialWasteKpiClick}
            title="Click to filter table for all users contributing to potential waste"
            aria-label="Potential Waste KPI: Click to filter table for all users contributing to potential waste"
          >
            <div className="text-gray-500 dark:text-gray-300 text-base mb-1 flex items-center justify-center gap-2">
              Potential Waste (annual, 90d inactive)
              <span
                title="The KPI sums all potentially wasted licenses for inactive users (counted only once per user). The table below may double-count users who hold multiple licenses, so the numbers can differ."
                aria-label="Potential Waste Info"
                style={{ cursor: "help", fontWeight: "bold", color: "#d97706" }}
              >
                ⓘ
              </span>
            </div>
            <div className="text-4xl font-bold text-red-600 dark:text-red-300">{formatCurrency(annualWastedLicenseSpend)}</div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-300 italic text-center">(Click to view all users contributing to waste)</div>
          </div>
        </div>
      </div>

      {/* --- Status Tiles + UserCharts --- */}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 mb-10">
        <div className="w-full bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl p-6 flex flex-col items-center">
          <div className="w-full flex flex-col md:flex-row justify-center gap-6 mb-6">
            <div className="bg-card rounded-2xl shadow p-4 flex flex-col items-center w-full">
              <span className="font-semibold text-lg text-gray-900 dark:text-white">Total Users</span>
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatNumber(statusCounts.total)}
              </span>
            </div>
            <div className="bg-card rounded-2xl shadow p-4 flex flex-col items-center w-full">
              <span className="font-semibold text-lg text-gray-900 dark:text-white">Active</span>
              <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatNumber(statusCounts.active)}
              </span>
            </div>
            <div className="bg-card rounded-2xl shadow p-4 flex flex-col items-center w-full">
              <span className="font-semibold text-lg text-gray-900 dark:text-white">Inactive</span>
              <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {formatNumber(statusCounts.inactive)}
              </span>
            </div>
          </div>
          <div className="w-full flex flex-col items-center">
            <UserCharts users={users} skus={skus} />
          </div>
        </div>
      </div>

      {/* --- Table & Filter Bar Section --- */}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 flex flex-col gap-8 items-center">

        {/* Info text */}
        <div className="text-xs text-gray-500 dark:text-gray-300 mt-2 mb-8 text-center w-full">
          <strong>Potential waste</strong> is the total annual cost of licenses assigned to users who have not signed in for 90+ days and are still enabled.<br />
          <span className="block">
            <strong>Why are there two numbers?</strong> The table below sums every potentially wasted license, so if a user holds multiple licenses, they're counted for each. The top KPI counts each user's waste only once.
          </span>
          All costs use current nonprofit pricing; no cost thresholds are used—every license dollar counts.
        </div>

        {/* License & Cost Analytics */}
        <div className="w-full mb-10">
          <div className="mb-3 font-bold text-lg text-blue-800 dark:text-blue-200 text-center w-full">License & Cost Analytics (by SKU)</div>
          <div className="overflow-x-auto rounded-2xl shadow bg-white dark:bg-neutral-900 w-full">
            <table className="min-w-full border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm text-center">
              <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left">License Name</th>
                  <th className="px-3 py-2 text-right">Assigned</th>
                  <th className="px-3 py-2 text-right">Annual Cost</th>
                  <th className="px-3 py-2 text-right">% of Total Spend</th>
                  <th className="px-3 py-2 text-right">Potential Waste (users)</th>
                  <th className="px-3 py-2 text-right">Potential Waste ($/yr)</th>
                </tr>
              </thead>
              <tbody>
                {skuAnalytics.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-400">No assigned licenses found.</td>
                  </tr>
                )}
                {skuAnalytics.map((sku) => (
                  <tr key={sku.skuId} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2">{sku.name}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(sku.assignedCount)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(sku.totalAnnualCost)}</td>
                    <td className="px-3 py-2 text-right">
                      {annualTotalSpend > 0
                        ? ((sku.totalAnnualCost / annualTotalSpend) * 100).toFixed(1) + "%"
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{sku.wasteCount > 0 ? formatNumber(sku.wasteCount) : "—"}</td>
                    <td className="px-3 py-2 text-right">{sku.totalWaste > 0 ? formatCurrency(sku.totalWaste) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- User Table + Filter Bar + Column Picker --- */}
        <AzureFilterBar
          allFields={allFields}
          fieldValues={fieldValues}
          filters={filters}
          setFilters={setFilters}
          downloadCSV={downloadCSV}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onClearFilters={() => setFilters([])}
          onColumnPicker={() => setColumnModalOpen(true)}
        />

        <AdvancedUserTable
          users={pagedUsers}
          loading={loading}
          Pagination={Pagination}
          visibleColumns={visibleColumns}
          columnLabels={COLUMN_LABELS}
        />

        <ColumnPickerModal
          open={columnModalOpen}
          onClose={() => setColumnModalOpen(false)}
          allFields={allFields}
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          columnLabels={COLUMN_LABELS}
        />
      </div>
    </div>
  );
};

export default Dashboard;