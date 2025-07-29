import { useState } from "react";

export default function ReportGenerator({ users }) {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("csv"); // csv, excel, pdf
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestReport = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/GetLicenseRecommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, users, format }),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const extension = format === "excel" ? "xlsx" : (format === "pdf" ? "pdf" : "csv");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-report.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 my-6">
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Describe your report (e.g. All inactive users with E5 licenses)"
        className="w-full p-2 border rounded"
        rows={2}
      />
      <div className="flex items-center gap-2">
        <label className="font-semibold">Format:</label>
        <select value={format} onChange={e => setFormat(e.target.value)} className="border px-2 py-1 rounded">
          <option value="csv">CSV</option>
          <option value="excel">Excel</option>
          <option value="pdf">PDF</option>
        </select>
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white font-semibold"
          onClick={requestReport}
          disabled={loading || !prompt.trim()}
        >
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
}