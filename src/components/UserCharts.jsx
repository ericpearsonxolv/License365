import React, { useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid,
} from "recharts";
import skuCosts from "../assets/MS365_SKU_costs";
import { getSkuDisplayName } from "../Utils/getSkuDisplayName";
import { formatCurrency, formatNumber, formatDate } from "../Utils/formatters";

// --- THEME HOOK ---
function useThemeMode() {
  const [mode, setMode] = useState(() =>
    typeof window !== "undefined"
      ? document.documentElement.classList.contains("dark")
        ? "dark"
        : "light"
      : "light"
  );

  React.useEffect(() => {
    const handler = () => {
      setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
    };
    const observer = new MutationObserver(handler);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return mode;
}

// ==== CONFIG ====
const PIE_TOP_N = 10;
const BAR_TOP_N = 6;
const COLORS = [
  "#2563eb", "#22c55e", "#f59e42", "#ef4444", "#a21caf", "#7dd3fc",
  "#fde047", "#6366f1", "#f43f5e", "#06b6d4", "#fbbf24", "#4ade80", "#e879f9", "#cbd5e1"
];

// Helper to truncate long license names for chart labels
function getShortLabel(name) {
  if (!name) return "";
  return name.length > 22 ? name.slice(0, 21) + "…" : name;
}

// Pie: count of users per license (total assignments) + cost
function getLicenseUsagePie(users, skus) {
  const usage = {};
  users.forEach(u => (u.licenses || []).forEach(sku => {
    usage[sku] = (usage[sku] || 0) + 1;
  }));
  let arr = Object.entries(usage)
    .map(([sku, count]) => ({
      name: getSkuDisplayName(sku, skus),
      value: count,
      sku,
      perUserCost: skuCosts[sku] || 0,
      totalCost: (skuCosts[sku] || 0) * count,
    }))
    .sort((a, b) => b.value - a.value);

  if (arr.length > PIE_TOP_N) {
    const top = arr.slice(0, PIE_TOP_N);
    const other = arr.slice(PIE_TOP_N);
    top.push({
      name: "Other",
      value: other.reduce((sum, x) => sum + x.value, 0),
      sku: "Other",
      perUserCost: 0,
      totalCost: other.reduce((sum, x) => sum + x.totalCost, 0),
    });
    return top;
  }
  return arr;
}

// Bar: assigned licenses per department (top N license types only)
function getLicenseUsageByDepartment(users, skus) {
  const skuCounts = {};
  users.forEach(u => (u.licenses || []).forEach(sku => {
    skuCounts[sku] = (skuCounts[sku] || 0) + 1;
  }));
  const topSkus = Object.entries(skuCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, BAR_TOP_N)
    .map(([sku]) => sku);

  const result = {};
  users.forEach(u => {
    const dept = u.department || "Unassigned";
    if (!result[dept]) result[dept] = {};
    (u.licenses || []).forEach(sku => {
      if (topSkus.includes(sku)) {
        result[dept][sku] = (result[dept][sku] || 0) + 1;
      } else {
        result[dept]["Other"] = (result[dept]["Other"] || 0) + 1;
      }
    });
  });

  return Object.entries(result).map(([department, skusObj]) => ({
    department,
    ...skusObj
  }));
}

// Wasted spend per department (users inactive > 90d), **ANNUALIZED**
function getWastedSpendByDepartment(users, skus) {
  const now = new Date();
  const deptSpend = {};
  users.forEach(u => {
    const lastSignIn = u.lastSignIn ? new Date(u.lastSignIn) : null;
    const monthsInactive = lastSignIn
      ? (now - lastSignIn) / (1000 * 60 * 60 * 24 * 30.44)
      : 99;
    if (monthsInactive >= 3 && (u.licenses || []).length) {
      const dept = u.department || "Unassigned";
      deptSpend[dept] = (deptSpend[dept] || 0) + (u.licenses || []).reduce(
        (sum, sku) => sum + ((skuCosts[sku] || 0) * 12), 0
      );
    }
  });
  return Object.entries(deptSpend).map(([department, value]) => ({
    department,
    value,
  }));
}

// Drilldown modal (friendly names and formatted date)
function DrilldownModal({ open, onClose, title, users, skus, skuId }) {
  if (!open) return null;
  const skuName = getSkuDisplayName(skuId, skus);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl font-bold text-gray-500 hover:text-red-500"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Users Assigned: <span className="text-primary">{skuName}</span>
        </h2>
        <div className="max-h-64 overflow-y-auto">
          {users.length ? (
            <ul>
              {users.map(u => (
                <li
                  key={u.id}
                  className="border-b border-gray-200 dark:border-neutral-700 py-2 text-gray-900 dark:text-white"
                >
                  <span className="font-semibold">
                    {u.name ||
                      u.displayName ||
                      u.userPrincipalName ||
                      u.email ||
                      u.mail ||
                      u.id}
                  </span>
                  {u.department && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-300">
                      [{u.department}]
                    </span>
                  )}
                  {u.lastSignIn && (
                    <span className="ml-2 text-xs text-gray-400">
                      (Last SignIn: {formatDate(u.lastSignIn)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 dark:text-gray-100">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const UserCharts = ({ users, skus }) => {
  const theme = useThemeMode();
  const chartText = theme === "dark" ? "#fff" : "#222";
  const gridColor = theme === "dark" ? "#444" : "#e5e7eb";
  const legendText = theme === "dark" ? "#fff" : "#222";
  const cardBg = theme === "dark" ? "bg-neutral-900" : "bg-white";

  const pieData = getLicenseUsagePie(users, skus);
  const barData = getLicenseUsageByDepartment(users, skus);
  const barSkus = Object.keys(barData[0] || {}).filter(k => k !== "department");

  const totalLicenses = pieData.reduce((sum, l) => sum + l.value, 0);
  const unusedUsers = users.filter(u => (u.licenses || []).length === 0).length;
  const highUsageDept = (() => {
    let max = 0, dept = "";
    barData.forEach(row => {
      const deptTotal = barSkus.reduce((sum, sku) => sum + (row[sku] || 0), 0);
      if (deptTotal > max) { max = deptTotal; dept = row.department; }
    });
    return { name: dept, count: max };
  })();

  const totalLicenseSpend = users.reduce(
    (sum, u) =>
      sum + (u.licenses || []).reduce((s, sku) => s + (skuCosts[sku] || 0), 0),
    0
  );
  const now = new Date();
  const wastedLicenseSpend = users.reduce((sum, u) => {
    if (!(u.licenses || []).length) return sum;
    const lastSignIn = u.lastSignIn ? new Date(u.lastSignIn) : null;
    const monthsInactive = lastSignIn
      ? (now - lastSignIn) / (1000 * 60 * 60 * 24 * 30.44)
      : 99;
    if (monthsInactive >= 3) {
      return sum + (u.licenses || []).reduce((s, sku) => s + ((skuCosts[sku] || 0) * 12), 0);
    }
    return sum;
  }, 0);

  const wastedByDept = getWastedSpendByDepartment(users, skus);

  const [modalOpen, setModalOpen] = useState(false);
  const [drillSku, setDrillSku] = useState("");
  const [drillUsers, setDrillUsers] = useState([]);

  const handlePieClick = (data) => {
    if (!data.sku || data.sku === "Other") return;
    setDrillSku(data.sku);
    setDrillUsers(users.filter(u => (u.licenses || []).includes(data.sku)));
    setModalOpen(true);
  };
  const handleBarClick = (bar) => {
    if (!bar.activeLabel || !bar.dataKey) return;
    setDrillSku(bar.dataKey);
    setDrillUsers(users.filter(u =>
      (u.licenses || []).includes(bar.dataKey) &&
      (u.department || "Unassigned") === bar.activeLabel
    ));
    setModalOpen(true);
  };

  return (
    <div className="mb-10">
      {/* --- Executive KPIs --- */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className={`rounded-2xl shadow p-4 flex flex-col items-center ${cardBg} text-gray-900 dark:text-white`}>
          <span className="font-semibold text-lg">Total License Assignments</span>
          <span className="text-2xl font-bold text-primary">{formatNumber(totalLicenses)}</span>
        </div>
        <div className={`rounded-2xl shadow p-4 flex flex-col items-center ${cardBg} text-gray-900 dark:text-white`}>
          <span className="font-semibold text-lg">Users with No License</span>
          <span className="text-2xl font-bold text-red-600">{formatNumber(unusedUsers)}</span>
        </div>
        <div className={`rounded-2xl shadow p-4 flex flex-col items-center ${cardBg} text-gray-900 dark:text-white`}>
          <span className="font-semibold text-lg">Top Dept. by Usage</span>
          <span className="text-2xl font-bold text-green-600">{highUsageDept.name || "—"}</span>
          <span className="text-sm">Licenses: {formatNumber(highUsageDept.count || 0)}</span>
        </div>
        <div className={`rounded-2xl shadow p-4 flex flex-col items-center ${cardBg} text-gray-900 dark:text-white`}>
          <span className="font-semibold text-lg">Monthly License Spend</span>
          <span className="text-2xl font-bold text-blue-600">{formatCurrency(totalLicenseSpend)}</span>
        </div>
        <div className={`rounded-2xl shadow p-4 flex flex-col items-center ${cardBg} text-gray-900 dark:text-white`}>
          <span className="font-semibold text-lg">Potential Waste (annual, 90d inactive)</span>
          <span className="text-2xl font-bold text-yellow-500">{formatCurrency(wastedLicenseSpend)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* --- Pie Chart: License Distribution (Top N only) --- */}
        <div
          className={`${cardBg} rounded-2xl shadow p-6 flex flex-col items-center w-full text-gray-900 dark:text-white`}
          style={{ minWidth: 0, minHeight: 340, overflowX: "auto" }}
        >
          <h2 className="text-xl font-semibold mb-4">License Usage Breakdown (Top {PIE_TOP_N} types)</h2>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={({ name, percent }) =>
                  `${getShortLabel(name)} (${(percent * 100).toFixed(1)}%)`
                }
                labelLine={false}
                onClick={handlePieClick}
                cursor="pointer"
              >
                {pieData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name, props) => {
                  const slice = pieData[props.dataIndex];
                  if (!slice) return [formatNumber(value), name];
                  const totalCost = slice.perUserCost * slice.value;
                  return [
                    `${formatNumber(value)} users\n${formatCurrency(totalCost)} monthly spend`,
                    getShortLabel(name)
                  ];
                }}
                contentStyle={{
                  background: theme === "dark" ? "#18181b" : "#fff",
                  color: chartText,
                  border: "1px solid " + gridColor,
                }}
                labelStyle={{ color: chartText }}
                itemStyle={{ color: chartText }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{
                  maxHeight: 80,
                  overflowY: "auto",
                  fontSize: 12,
                  width: "95%",
                  margin: "0 auto",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* --- Bar Chart: Licenses by Department (Top N only) --- */}
        <div
          className={`${cardBg} rounded-2xl shadow p-6 flex flex-col items-center w-full text-gray-900 dark:text-white`}
          style={{ minWidth: 0, minHeight: 340, overflowX: "auto" }}
        >
          <h2 className="text-xl font-semibold mb-4">Licenses Assigned per Department (Top {BAR_TOP_N} types + Other)</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={barData}
              onClick={(data) => {
                if (data && data.activeLabel && data.activePayload && data.activePayload[0]) {
                  const activeBar = data.activePayload[0];
                  handleBarClick({ activeLabel: data.activeLabel, dataKey: activeBar.dataKey });
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="department" stroke={chartText} tick={{ fill: chartText, fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke={chartText} tick={{ fill: chartText, fontSize: 12 }} tickFormatter={formatNumber} />
              <Tooltip
                formatter={formatNumber}
                contentStyle={{
                  background: theme === "dark" ? "#18181b" : "#fff",
                  color: chartText,
                  border: "1px solid " + gridColor,
                }}
                labelStyle={{ color: chartText }}
                itemStyle={{ color: chartText }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{
                  maxHeight: 80,
                  overflowY: "auto",
                  fontSize: 12,
                  width: "95%",
                  margin: "0 auto",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              />
              {barSkus.map((sku, idx) => (
                <Bar
                  key={sku}
                  dataKey={sku}
                  stackId="a"
                  fill={COLORS[idx % COLORS.length]}
                  name={getShortLabel(getSkuDisplayName(sku, skus))}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- Wasted Spend by Department Chart (annualized) --- */}
      <div
        className={`${cardBg} rounded-2xl shadow p-6 mt-8 flex flex-col items-center w-full text-gray-900 dark:text-white`}
        style={{ minWidth: 0, minHeight: 340, overflowX: "auto" }}
      >
        <h2 className="text-xl font-semibold mb-4">Wasted License Spend by Department (annual, 90+ days inactive)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={wastedByDept}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="department" stroke={chartText} tick={{ fill: chartText, fontSize: 12 }} />
            <YAxis allowDecimals={false} tickFormatter={formatCurrency} stroke={chartText} tick={{ fill: chartText, fontSize: 12 }} />
            <Tooltip
              formatter={formatCurrency}
              contentStyle={{
                background: theme === "dark" ? "#18181b" : "#fff",
                color: chartText,
                border: "1px solid " + gridColor,
              }}
              labelStyle={{ color: chartText }}
              itemStyle={{ color: chartText }}
            />
            <Bar dataKey="value" fill="#fbbf24" name="Potential Waste ($/yr)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* --- Drilldown Modal --- */}
      <DrilldownModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Users with Selected License"
        users={drillUsers}
        skus={skus}
        skuId={drillSku}
      />
    </div>
  );
};

export default UserCharts;