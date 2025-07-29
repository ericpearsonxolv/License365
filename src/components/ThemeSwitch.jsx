import React, { useState, useEffect } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';

const ThemeSwitch = () => {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const classObserver = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    classObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => classObserver.disconnect();
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    document.documentElement.classList.toggle('dark', newIsDark);
    setIsDark(newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-label="Toggle dark mode"
      aria-checked={isDark}
      className={`
        relative inline-flex items-center justify-center w-12 h-12 rounded-full
        border-2 border-gray-300 dark:border-gray-700
        bg-white dark:bg-neutral-800
        shadow transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        hover:bg-gray-200 dark:hover:bg-neutral-700
      `}
    >
      <span className="sr-only">Toggle dark mode</span>
      <span className="absolute inset-0 flex items-center justify-center">
        {isDark ? (
          <MoonIcon className="w-7 h-7 text-blue-400 dark:text-blue-200 transition" />
        ) : (
          <SunIcon className="w-7 h-7 text-yellow-400 transition" />
        )}
      </span>
    </button>
  );
};

export default ThemeSwitch;