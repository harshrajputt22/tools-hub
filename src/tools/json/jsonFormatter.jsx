"use client";

import { useState, useCallback, useEffect } from "react";
import { formatJson, minifyJson } from "@/utils/formatters";
import { getSampleInput, copyToClipboard } from "@/lib/helpers";

// ── Indent options ────────────────────────────────────────────
const INDENT_OPTIONS = [
  { value: 2,     label: "2 spaces" },
  { value: 4,     label: "4 spaces" },
  { value: "tab", label: "Tabs"     },
];

// ── Stats bar ─────────────────────────────────────────────────
function StatsBar({ stats }) {
  if (!stats) return null;
  const items = [
    { label: "Input",  value: `${stats.inputLength?.toLocaleString()  ?? 0} chars` },
    { label: "Output", value: `${stats.outputLength?.toLocaleString() ?? 0} chars` },
    { label: "Lines",  value:  stats.outputLines?.toLocaleString()    ?? 0         },
    { label: "Keys",   value:  stats.keyCount?.toLocaleString()       ?? 0         },
  ];
  return (
    <div className="flex flex-wrap gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className="font-mono font-semibold text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────
function CopyBtn({ text, disabled }) {
  const [state, setState] = useState("idle");
  async function handleCopy() {
    if (!text || disabled) return;
    const ok = await copyToClipboard(text);
    setState(ok ? "copied" : "error");
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button onClick={handleCopy} disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 text-gray-700">
      {state === "copied" ? (
        <>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : state === "error" ? (
        <span className="text-red-500">Failed</span>
      ) : (
        <>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

// ── Panel header ──────────────────────────────────────────────
function PanelHeader({ label, value, onClear, extra }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        {value && (
          <span className="text-xs text-gray-400 tabular-nums">
            {value.length.toLocaleString()} chars
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {extra}
        {value && onClear && (
          <button onClick={onClear}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mt-2">
      <svg width="15" height="15" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs font-mono text-red-700 leading-relaxed">{message}</p>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <div onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${checked ? "bg-blue-600" : "bg-gray-300"}`}>
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JsonFormatter() {
  const [input,   setInput]   = useState("");
  const [output,  setOutput]  = useState("");
  const [error,   setError]   = useState(null);
  const [stats,   setStats]   = useState(null);
  const [indent,  setIndent]  = useState(2);
  const [sortKeys,setSortKeys]= useState(false);
  const [autoFmt, setAutoFmt] = useState(false);

  const handleFormat = useCallback(() => {
    if (!input.trim()) { setError("Please enter JSON to format."); setOutput(""); setStats(null); return; }
    const result = formatJson(input, { indent, sortKeys });
    if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
    else { setOutput(""); setError(result.error); setStats(null); }
  }, [input, indent, sortKeys]);

  useEffect(() => {
    if (!autoFmt || !input.trim()) return;
    const t = setTimeout(handleFormat, 300);
    return () => clearTimeout(t);
  }, [input, autoFmt, handleFormat]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleFormat();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleFormat]);

  function handleMinify() {
    if (!input.trim()) { setError("Please enter JSON to minify."); return; }
    const result = minifyJson(input);
    if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
    else { setOutput(""); setError(result.error); setStats(null); }
  }

  function handleClear() { setInput(""); setOutput(""); setError(null); setStats(null); }

  function handleInputChange(val) { setInput(val); if (error) setError(null); }

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleFormat} data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Format JSON
        </button>

        <button onClick={handleMinify}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-all">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          Minify
        </button>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Indent:</label>
          <select value={indent} onChange={(e) => setIndent(e.target.value === "tab" ? "tab" : parseInt(e.target.value))}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-gray-700 cursor-pointer">
            {INDENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <Toggle checked={sortKeys} onChange={setSortKeys} label="Sort keys" />
        <Toggle checked={autoFmt}  onChange={setAutoFmt}  label="Auto format" />

        <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">↵</kbd>
          <span>to format</span>
        </div>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input */}
        <div className="flex flex-col">
          <PanelHeader label="Input" value={input} onClear={handleClear} />
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste your JSON here..."
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 rounded-b-xl outline-none resize-none min-h-[320px] focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader label="Output" value={output} extra={<CopyBtn text={output} disabled={!output} />} />
          <div className="relative flex-1">
            <textarea
              value={output}
              readOnly
              placeholder="Formatted JSON will appear here..."
              spellCheck={false}
              className="w-full h-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 border border-gray-200 rounded-b-xl outline-none resize-none min-h-[320px] text-gray-800 cursor-default select-all placeholder:text-gray-300"
            />
            {/* Empty state */}
            {!output && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2 rounded-b-xl">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center opacity-40">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
                <p className="text-xs text-gray-300">Output will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      {stats && <StatsBar stats={stats} />}
    </div>
  );
}