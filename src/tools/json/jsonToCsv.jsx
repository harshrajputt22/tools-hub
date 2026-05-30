"use client";

import { useState, useCallback, useEffect } from "react";
import { jsonToCsv } from "@/utils/converters";
import { copyToClipboard, downloadText } from "@/lib/helpers";

const DELIMITER_OPTIONS = [
  { value: ",",  label: "Comma (,)"    },
  { value: ";",  label: "Semicolon (;)"},
  { value: "\t", label: "Tab"          },
  { value: "|",  label: "Pipe (|)"     },
];

function estimateRowCount(input) {
  if (!input.trim()) return 0;
  try {
    const parsed = JSON.parse(input.trim());
    if (Array.isArray(parsed)) return parsed.length;
    if (typeof parsed === "object" && parsed !== null) return 1;
    return 0;
  } catch { return 0; }
}

// ── Toggle ────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} title={description}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 ${checked ? "bg-blue-600" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );
}

function PanelHeader({ label, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        {meta && <span className="text-xs text-gray-400 tabular-nums">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
      <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs font-mono text-red-700 leading-relaxed break-all">{message}</p>
    </div>
  );
}

function CopyButton({ text }) {
  const [state, setState] = useState("idle");
  async function handleCopy() {
    if (!text) return;
    const ok = await copyToClipboard(text);
    setState(ok ? "copied" : "error");
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button onClick={handleCopy} disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 rounded-lg transition-colors">
      {state === "copied" ? (
        <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span className="text-green-600">Copied!</span></>
      ) : (
        <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
      )}
    </button>
  );
}

function DownloadButton({ output, filename }) {
  return (
    <button onClick={() => output && downloadText(output, filename, "text/csv;charset=utf-8;")} disabled={!output}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Download .csv
    </button>
  );
}

function StatsBar({ stats, delimiter }) {
  if (!stats) return null;
  const items = [
    { label: "Rows",      value: stats.rowCount?.toLocaleString()    ?? 0 },
    { label: "Columns",   value: stats.columnCount?.toLocaleString() ?? 0 },
    { label: "Delimiter", value: delimiter === "\t" ? "Tab" : delimiter   },
    { label: "Input",     value: `${stats.inputLength?.toLocaleString()  ?? 0} chars` },
    { label: "Output",    value: `${stats.outputLength?.toLocaleString() ?? 0} chars` },
  ];
  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className="font-mono font-semibold text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
}

function ColumnChips({ columns }) {
  if (!columns || columns.length === 0) return null;
  return (
    <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
        Detected Columns ({columns.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {columns.map((col, i) => (
          <span key={`${col}-${i}`} className="px-2 py-0.5 bg-white border border-blue-200 text-blue-700 text-xs rounded-md font-mono">
            {col}
          </span>
        ))}
      </div>
    </div>
  );
}

function CsvPreviewTable({ csvText, maxRows = 5 }) {
  if (!csvText) return null;
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;
  const headers  = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
  const dataRows = lines.slice(1, maxRows + 1).map((line) => line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim()));
  const hasMore  = lines.length - 1 > maxRows;
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preview</span>
        {hasMore && <span className="text-xs text-gray-400">Showing {maxRows} of {lines.length - 1} rows</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {headers.map((_, ci) => (
                  <td key={ci} className="px-3 py-2 text-gray-600 font-mono whitespace-nowrap max-w-[160px] truncate border-b border-gray-100">
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Empty state — table SVG instead of 📊 emoji ──────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[380px] border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-4">
      <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-sm">
        <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
        </svg>
      </div>
      <div className="text-center px-6">
        <p className="text-sm font-medium text-gray-400">Paste a JSON array to convert</p>
        <p className="text-xs text-gray-300 mt-1">Supports flat arrays, nested objects, single objects</p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JsonToCsv() {
  const [input,       setInput]       = useState("");
  const [output,      setOutput]      = useState("");
  const [error,       setError]       = useState(null);
  const [stats,       setStats]       = useState(null);
  const [delimiter,   setDelimiter]   = useState(",");
  const [headers,     setHeaders]     = useState(true);
  const [flatten,     setFlatten]     = useState(true);
  const [nullValue,   setNullValue]   = useState("");
  const [bom,         setBom]         = useState(false);
  const [activeTab,   setActiveTab]   = useState("raw");
  const [autoConvert, setAutoConvert] = useState(false);

  const handleConvert = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) { setError("Input is empty. Please paste a JSON array."); setOutput(""); setStats(null); return; }
    if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) {
      setError("Input must be a JSON array [ ] or object { }."); setOutput(""); setStats(null); return;
    }
    const result = jsonToCsv(trimmed, { delimiter, headers, flatten, nullValue, bom });
    if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
    else { setOutput(""); setError(result.error); setStats(null); }
  }, [input, delimiter, headers, flatten, nullValue, bom]);

  useEffect(() => {
    if (!autoConvert || !input.trim()) return;
    const t = setTimeout(handleConvert, 500);
    return () => clearTimeout(t);
  }, [input, autoConvert, handleConvert]);

  useEffect(() => { if (output) handleConvert(); }, [delimiter, headers, flatten, bom]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleConvert();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleConvert]);

  function handleInputChange(value) { setInput(value); if (error) setError(null); }
  function handleClear() { setInput(""); setOutput(""); setError(null); setStats(null); }

  const estimatedRows = estimateRowCount(input);
  const outputLines   = output ? output.split("\n").filter((l) => l.trim()).length : 0;
  const inputMeta     = input  ? `${input.length.toLocaleString()} chars${estimatedRows > 0 ? ` · ~${estimatedRows} rows` : ""}` : null;
  const outputMeta    = output ? `${outputLines} rows · ${output.length.toLocaleString()} chars` : null;

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleConvert} data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Convert to CSV
        </button>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Delimiter:</label>
          <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-gray-700 cursor-pointer">
            {DELIMITER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Null as:</label>
          <input type="text" value={nullValue} onChange={(e) => setNullValue(e.target.value)} placeholder='""'
            className="w-16 px-2.5 py-1.5 text-xs font-mono bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-gray-700" />
        </div>

        <Toggle checked={headers}     onChange={setHeaders}     label="Headers"         description="Include column headers as first row" />
        <Toggle checked={flatten}     onChange={setFlatten}     label="Flatten nested"  description="Flatten nested objects using dot notation" />
        <Toggle checked={bom}         onChange={setBom}         label="Excel BOM"       description="Add UTF-8 BOM for Excel compatibility" />
        <Toggle checked={autoConvert} onChange={setAutoConvert} label="Auto convert"    description="Convert automatically as you type" />

        {(input || output) && (
          <button onClick={handleClear}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors ml-auto">
            Clear
          </button>
        )}

        <div className={`hidden sm:flex items-center gap-1 text-xs text-gray-400 ${!(input || output) ? "ml-auto" : ""}`}>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
          <span>to convert</span>
        </div>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input */}
        <div className="flex flex-col">
          <PanelHeader label="JSON Input" meta={inputMeta}
            actions={input && (
              <button onClick={handleClear}
                className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                Clear
              </button>
            )}
          />
          <textarea value={input} onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste JSON array here..."
            spellCheck={false} autoCorrect="off" autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[360px] focus:border-blue-400 transition-colors placeholder:text-gray-300"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader label="CSV Output" meta={outputMeta}
            actions={output && (
              <>
                <div className="flex items-center gap-0.5 p-0.5 bg-gray-200 rounded-lg mr-1">
                  <button onClick={() => setActiveTab("raw")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activeTab === "raw" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    Raw
                  </button>
                  <button onClick={() => setActiveTab("preview")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activeTab === "preview" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    Preview
                  </button>
                </div>
                <CopyButton text={output} />
                <DownloadButton output={output} filename="data.csv" />
              </>
            )}
          />
          <div className="flex-1 relative border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[360px]">
            {output ? (
              activeTab === "raw" ? (
                <textarea value={output} readOnly spellCheck={false}
                  className="w-full h-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[360px] text-gray-800 cursor-default select-all"
                />
              ) : (
                <div className="p-3 overflow-auto min-h-[360px]">
                  <CsvPreviewTable csvText={output} maxRows={8} />
                </div>
              )
            ) : !error ? (
              <EmptyState />
            ) : (
              // ── Error state — triangle SVG instead of ⚠️ emoji ──
              <div className="flex flex-col items-center justify-center min-h-[360px] gap-3 p-6">
                <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <p className="text-xs text-red-500 font-mono text-center leading-relaxed break-all max-w-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      <StatsBar stats={stats} delimiter={delimiter} />
      {stats?.columns && <ColumnChips columns={stats.columns} />}

    </div>
  );
}