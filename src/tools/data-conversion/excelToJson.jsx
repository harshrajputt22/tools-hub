"use client";
import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  CopyButton, DownloadButton, PanelHeader, ErrorBanner,
  StatsBar, ClearButton,
  FileDropZone, Toolbar, OutputTextPanel,
  downloadBlob, readFileAsArrayBuffer,
} from "./_shared";

// ── Helpers ───────────────────────────────────────────────────
function parseWorkbook(arrayBuffer) {
  const wb     = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const sheets = {};
  wb.SheetNames.forEach((name) => {
    const ws   = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { defval: null });
    sheets[name] = data;
  });
  return { sheetNames: wb.SheetNames, sheets };
}

// ── Component ─────────────────────────────────────────────────
export default function ExcelToJson() {
  const [fileName,    setFileName]    = useState("");
  const [sheetNames,  setSheetNames]  = useState([]);
  const [sheets,      setSheets]      = useState({});
  const [activeSheet, setActiveSheet] = useState("");
  const [output,      setOutput]      = useState("");
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [stats,       setStats]       = useState(null);

  const reset = () => {
    setFileName(""); setSheetNames([]); setSheets({});
    setActiveSheet(""); setOutput(""); setError(null); setStats(null);
  };

  const selectSheet = useCallback((name, allSheets) => {
    const data = allSheets[name] || [];
    const json = JSON.stringify(data, null, 2);
    const cols = data.length ? Object.keys(data[0]).length : 0;
    setActiveSheet(name);
    setOutput(json);
    setStats([
      { label: "Sheet",   value: name },
      { label: "Rows",    value: data.length },
      { label: "Columns", value: cols },
      { label: "Chars",   value: json.length.toLocaleString() },
    ]);
  }, []);

  const handleFile = useCallback(async (file, err) => {
    if (err) { setError(err); return; }
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "ods"].includes(ext)) {
      setError("Please upload a .xlsx, .xls, or .ods file."); return;
    }
    setLoading(true); setError(null); reset();

    await new Promise((r) => setTimeout(r, 0));
    try {
      const buf = await readFileAsArrayBuffer(file);
      const { sheetNames: names, sheets: allSheets } = parseWorkbook(buf);
      setFileName(file.name);
      setSheetNames(names);
      setSheets(allSheets);
      selectSheet(names[0], allSheets);
    } catch (e) {
      setError(`Failed to parse Excel file: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectSheet]);

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/json" });
    const name = fileName.replace(/\.(xlsx|xls|ods)$/i, "") + `_${activeSheet}.json`;
    downloadBlob(blob, name);
  };

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <Toolbar>
        {output && <CopyButton text={output} />}
        {output && <DownloadButton onClick={handleDownload} label="Download .json" />}
        {(fileName || output) && <ClearButton onClick={reset} />}
        <span className="text-xs text-gray-400 ml-auto">Upload an Excel file to begin</span>
      </Toolbar>

      {/* ── Sheet selector ───────────────────────────────────── */}
      {sheetNames.length > 1 && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl flex-wrap">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sheet:</span>
          {sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => selectSheet(name, sheets)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                activeSheet === name
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Upload + file info */}
        <div className="flex flex-col gap-3">
          <FileDropZone
            onFile={handleFile}
            accept=".xlsx,.xls,.ods"
            acceptLabel=".xlsx, .xls, .ods · Max 10 MB"
            fileName={fileName}
            disabled={loading}
          />

          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
              <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs font-medium text-blue-700">Parsing spreadsheet…</span>
            </div>
          )}

          {stats && (
            <div className="flex flex-col">
              <PanelHeader label="File Info" />
              <div className="p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-400">File:</span>
                  <span className="font-mono font-semibold text-gray-700 truncate">{fileName}</span>
                </div>
                {sheetNames.map((n) => (
                  <div key={n} className="flex items-center gap-1.5 text-xs">
                    <span className="text-gray-400">Sheet:</span>
                    <span className={`font-semibold ${n === activeSheet ? "text-blue-700" : "text-gray-500"}`}>{n}</span>
                    <span className="text-gray-400">({(sheets[n] || []).length} rows)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Output */}
        <OutputTextPanel
          label="JSON Output"
          value={output}
          meta={output ? `${output.length.toLocaleString()} chars` : null}
          emptyText="Converted JSON appears here"
          actions={output && <><CopyButton text={output} /><DownloadButton onClick={handleDownload} label=".json" /></>}
        />
      </div>

      <ErrorBanner message={error} />
      {stats && <StatsBar items={stats} />}
    </div>
  );
}