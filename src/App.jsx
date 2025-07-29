import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import Dashboard from "./Dashboard";
import AtlassianDashboard from "./Pages/AtlassianDashboard"; // placeholder

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard/microsoft" element={<Dashboard />} />
        <Route path="/dashboard/atlassian" element={<AtlassianDashboard />} />
        {/* Add more SaaS dashboards here */}
      </Routes>
    </Router>
  );
}