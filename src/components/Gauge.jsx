import React from "react";
import { PieChart, Pie, Cell } from "recharts";

const getGaugeColor = (pct) => {
  if (pct < 0.05) return "#22c55e";
  if (pct < 0.15) return "#fde047";
  return "#ef4444";
};

const Gauge = ({ percent = 0, width = 200, label = "License Waste" }) => {
  const value = Math.max(0, Math.min(1, isNaN(percent) ? 0 : percent));
  const gaugeData = [
    { value: value * 100 },
    { value: 100 - value * 100 }
  ];
  const color = getGaugeColor(value);

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <PieChart width={width} height={width / 2}>
        <Pie
          data={gaugeData}
          startAngle={180}
          endAngle={0}
          innerRadius={width * 0.32}
          outerRadius={width * 0.45}
          dataKey="value"
        >
          <Cell key="gauge" fill={color} />
          <Cell key="rest" fill="#e5e7eb" />
        </Pie>
      </PieChart>
      <div className="text-lg font-semibold mt-[-38px] mb-2" style={{ color }}>
        {label}
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color }}>
        {(value * 100).toFixed(1)}%
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-300">
        {value < 0.05 && "Healthy"}
        {value >= 0.05 && value < 0.15 && "Poor"}
        {value >= 0.15 && "Needs Attention"}
      </div>
    </div>
  );
};

export default Gauge;