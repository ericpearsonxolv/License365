import React from "react";

export default function KpiCard({ title, value, icon, trend }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-800 shadow p-5 flex flex-col gap-2 min-w-[200px]">
      <div className="flex items-center gap-2">
        {icon && <span>{icon}</span>}
        <span className="text-gray-500 dark:text-gray-400 text-sm">{title}</span>
      </div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
      {trend && (
        <div className={`text-xs ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
          {trend === "up" ? "▲" : "▼"} {trend}
        </div>
      )}
    </div>
  );
}