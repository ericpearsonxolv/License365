import React from "react";
import { useNavigate } from "react-router-dom";
import ThemeSwitch from "./ThemeSwitch";

export default function Header() {
  const navigate = useNavigate();

  // Clickable header area routes home
  const handleHomeClick = () => navigate("/");

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-center px-4 py-3 bg-white dark:bg-neutral-900 shadow-md border-b border-gray-100 dark:border-neutral-800">
      {/* Clickable: Centered Logo + Title */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 cursor-pointer select-none outline-none focus:ring-2 focus:ring-blue-600 rounded"
        onClick={handleHomeClick}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && handleHomeClick()}
        tabIndex={0}
        role="button"
        aria-label="Go to Home"
        style={{ userSelect: "none" }}
      >
        <div className="relative h-10 w-10 flex-shrink-0">
          {/* Light logo */}
          <img
            src="/assets/Logo-Color-Positive-Light.svg"
            alt="FOC Logo Light"
            className="block dark:hidden h-10 w-10 object-contain"
          />
          {/* Dark logo */}
          <img
            src="/assets/Logo-Color-Positive-Dark.svg"
            alt="FOC Logo Dark"
            className="hidden dark:block h-10 w-10 object-contain"
          />
        </div>
        <span className="text-2xl font-bold tracking-wide text-gray-900 dark:text-white whitespace-nowrap drop-shadow">
          License 365 Dashboard
        </span>
      </div>
      {/* ThemeSwitch always right */}
      <div className="ml-auto z-10">
        <ThemeSwitch />
      </div>
    </header>
  );
}