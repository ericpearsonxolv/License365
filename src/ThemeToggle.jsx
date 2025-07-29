import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  useEffect(() => {
    const classList = document.documentElement.classList;
    if (isDark) {
      classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Listen for manual system dark mode changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (!localStorage.getItem("theme")) {
        setIsDark(mq.matches);
      }
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    // On load, respect saved preference or system preference
    const saved = localStorage.getItem("theme");
    if (!saved) {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    } else {
      setIsDark(saved === "dark");
    }
  }, []);

  return (
    <button
      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      onClick={() => setIsDark((v) => !v)}
    >
      {isDark ? (
        // Moon icon
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="text-yellow-400" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="currentColor"
          />
        </svg>
      ) : (
        // Sun icon
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="text-yellow-400" xmlns="http://www.w3.org/2000/svg">
          <circle cx={12} cy={12} r={5} stroke="currentColor" strokeWidth={2} fill="currentColor" />
          <path stroke="currentColor" strokeWidth={2} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      )}
    </button>
  );
}