// src/components/Logo.jsx
import React from "react";
import logoLight from "../assets/Logo-Color-Posititve.svg";
import logoDark from "../assets/Logo-Color-Posititve.svg";

const Logo = ({ isDarkMode }) => (
  <img
    src={isDarkMode ? logoDark : logoLight}
    alt="Xolv Logo"
    className="h-10 w-auto"
  />
);

export default Logo;