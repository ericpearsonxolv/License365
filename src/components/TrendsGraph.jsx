import React, { useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import dayjs from "dayjs";

function getUserIdSet(users) {
  return new Set(users.map(u => u.id || u.userPrincipalName || u.mail));
}

function buildTrendsData(snapshots, fromDate, toDate) {
  const byDate = {};

  snapshots.forEach(snap => {
    const date = dayjs(snap.timestamp).format("YYYY-MM-DD");
    if (!byDate[date]) byDate[date] = [];

    const flat = {
      timestamp: snap.timestamp,
      id: snap.graphData?.id,
      userPrincipalName: snap.graphData?.userPrincipalName,
      mail: snap.graphData?.mail,
      isActive: snap.graphData?.accountEnabled !== false,
      licenses: snap.graphData?.assignedLicenses || []
    };

    byDate[date].push(flat);
  });

  const dateKeys = [];
  let curr = dayjs(fromDate);
  while (curr.isBefore(dayjs(toDate).add(1, "day"))) {
    dateKeys.push(curr.format("YYYY-MM-DD"));
    curr = curr.add(1, "day");
  }

  let lastUserSet = new Set();

  return dateKeys.map(date => {
    const users = byDate[date] || [];

    const userSet = getUserIdSet(users.filter(u => u.isActive));
    const newUsers = [...userSet].filter(id => !lastUserSet.has(id));
    const offboarded = [...lastUserSet].filter(id => !userSet.has(id));

    const totalLicenses = users.reduce(
      (sum, u) => (u.isActive && Array.isArray(u.licenses) ? sum + u.licenses.length : sum),
      0
    );

    const inactiveCount = users.filter(u => !u.isActive).length;

    lastUserSet = userSet;

    return {
      date,
      totalLicenses,
      newUsers: newUsers.length,
      offboardedUsers: offboarded.length,
      inactiveUsers: inactiveCount
    };
  });
}

export default function TrendsGraph({ snapshots }) {
  const [days, setDays] = useState(7);
  const now = dayjs();
  const fromDate = now.subtract(days - 1, "day").format("YYYY-MM-DD");
  const toDate = now.format("YYYY-MM-DD");

  const data = useMemo(() => {
    if (!snapshots?.length) return [];
    return buildTrendsData(snapshots, fromDate, toDate);
  }, [snapshots, fromDate, toDate]);

  return (
    <div className="w-full bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-bold text-lg text-blue-800 dark:text-blue-200 mb-2">
            License Usage & User Trends
          </div>
          <div className="text-xs text-gray-400 mb-2">
            Showing {days === 365 ? "last year" : `last ${days} days`} — Choose range:&nbsp;
            <select
              className="border rounded px-2 py-1"
              value={days}
              onChange={e => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 365 days</option>
            </select>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={str => dayjs(str).format("MM/DD")} />
          <YAxis />
          <Tooltip labelFormatter={str => dayjs(str).format("MMMM D, YYYY")} />
          <Legend />
          <Area type="monotone" dataKey="totalLicenses" stroke="#2563eb" fill="#93c5fd" name="Total Licenses" />
          <Bar dataKey="newUsers" fill="#22c55e" name="New Users" />
          <Bar dataKey="offboardedUsers" fill="#ef4444" name="Offboarded Users" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-500 mt-3">
        <span className="font-semibold">Tip:</span> The blue area shows total assigned licenses, green bars show new users, and red bars show users offboarded/inactivated. Use the dropdown to select a date range (up to 1 year, as available).
      </div>
    </div>
  );
}