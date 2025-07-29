import React from "react";
import { getSkuDisplayName } from "../Utils/getSkuDisplayName";
import { formatCurrency, formatDate } from "../Utils/formatters";

// Helper functions
function getUserPotentialWasteMonthly(user, skuCosts) {
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
function getUserPotentialWasteAnnual(user, skuCosts) {
  return getUserPotentialWasteMonthly(user, skuCosts) * 12;
}
function isOnLeave(user) {
  return !!user.employeeLeaveDateTime || !!user.onLeave || !!user.leaveOfAbsence;
}

const UserTable = ({ pagedUsers, skus, skuCosts, loading, Pagination }) => {
  return (
    <div className="w-full overflow-x-auto rounded-2xl shadow bg-white dark:bg-neutral-900">
      {loading ? (
        <div className="text-center py-10 font-semibold">Loading users…</div>
      ) : (
        <>
          <table className="min-w-full border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-center">
            <thead className="bg-gray-200 dark:bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Licenses</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Job Title</th>
                <th className="px-4 py-2">Domain</th>
                <th className="px-4 py-2">Last Sign-in</th>
                <th className="px-4 py-2">Potential Waste</th>
                <th className="px-4 py-2">Leave of Absence</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((user, idx) => {
                const wasteAnnual = getUserPotentialWasteAnnual(user, skuCosts);
                return (
                  <tr
                    key={user.id}
                    className={`border-t border-gray-300 dark:border-gray-600 ${
                      idx % 2 === 0
                        ? "bg-white dark:bg-gray-900"
                        : "bg-gray-50 dark:bg-gray-800"
                    } hover:bg-blue-50 dark:hover:bg-blue-950 transition text-gray-900 dark:text-white`}
                  >
                    <td className="px-4 py-2">{user.name}</td>
                    <td className="px-4 py-2">{user.status}</td>
                    <td className="px-4 py-2">
                      {(user.licenses || []).length === 0
                        ? "—"
                        : (user.licenses || []).map(
                            (sku) => getSkuDisplayName(sku, skus)
                          ).join(", ")
                      }
                    </td>
                    <td className="px-4 py-2">{user.department || "—"}</td>
                    <td className="px-4 py-2">{user.jobTitle || "—"}</td>
                    <td className="px-4 py-2">{user.domain || "—"}</td>
                    <td className="px-4 py-2">{formatDate(user.lastSignIn)}</td>
                    <td className="px-4 py-2">
                      {wasteAnnual > 0 ? (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-semibold text-xs">
                          Potential Waste ({formatCurrency(wasteAnnual)}/yr)
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {isOnLeave(user) ? (
                        <span className="bg-blue-100 text-blue-900 px-2 py-1 rounded font-semibold text-xs">
                          Yes
                        </span>
                      ) : (
                        "No"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {Pagination && <Pagination />}
        </>
      )}
    </div>
  );
};

export default UserTable;