import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  // Handler for clicking the logo/title area
  const handleHomeClick = () => navigate("/");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 dark:from-neutral-900 dark:to-neutral-800 px-4">
      <div className="max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl p-10 flex flex-col gap-6 items-center">
        {/* Clickable area for logo + title */}
        <div
          className="flex flex-col items-center gap-1 cursor-pointer select-none outline-none focus:ring-2 focus:ring-blue-600"
          onClick={handleHomeClick}
          onKeyDown={e => (e.key === "Enter" || e.key === " ") && handleHomeClick()}
          tabIndex={0}
          role="button"
          aria-label="Go to Home"
        >
          {/* Responsive logo swap for theme */}
          <div className="relative h-14 w-auto mb-2">
            <img
              src="/assets/Logo-Color-Positive-Light.svg"
              alt="Platform Logo (Light)"
              className="block dark:hidden h-14 w-auto max-w-xs"
              style={{ objectFit: "contain" }}
            />
            <img
              src="/assets/Logo-Color-Positive-Dark.svg"
              alt="Platform Logo (Dark)"
              className="hidden dark:block h-14 w-auto max-w-xs"
              style={{ objectFit: "contain" }}
            />
          </div>
          <h1 className="text-4xl font-bold text-blue-700 dark:text-blue-200 text-center">
            License 365: Unified SaaS License Dashboard
          </h1>
        </div>
        <p className="text-lg text-gray-700 dark:text-gray-200 text-center">
          Monitor, optimize, and govern your SaaS licensing across Microsoft 365, Atlassian, and more—all in one unified view.
        </p>
        <div className="w-full flex flex-col sm:flex-row gap-6 mt-4">
          <button
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-lg shadow-lg hover:scale-105 transition"
            onClick={() => navigate("/dashboard/microsoft")}
          >
            Microsoft 365 Dashboard
          </button>
          <button
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-gray-400 to-gray-600 text-white font-semibold text-lg shadow-lg hover:scale-105 transition"
            onClick={() => navigate("/dashboard/atlassian")}
          >
            Atlassian Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}