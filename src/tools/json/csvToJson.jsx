"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { csvToJson } from "@/utils/converters";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// CONSTANTS
// ============================================================

const DELIMITER_OPTIONS = [
  { value: "auto", label: "Auto detect"   },
  { value: ",",    label: "Comma (,)"     },
  { value: ";",    label: "Semicolon (;)" },
  { value: "\t",   label: "Tab"           },
  { value: "|",    label: "Pipe (|)"      },
];

const INDENT_OPTIONS = [
  { value: 2, label: "2 spaces" },
  { value: 4, label: "4 spaces" },
];

const SAMPLE_BASIC = `id,name,email,age,city,active,score
1,Alice Johnson,alice@example.com,28,New York,true,95.5
2,Bob Smith,bob@example.com,34,London,false,87.2
3,Carol White,carol@example.com,26,Tokyo,true,92.8
4,David Brown,david@example.com,31,Sydney,true,78.9
5,Emma Wilson,emma@example.com,29,Paris,false,88.1`;

const SAMPLE_SEMICOLON = `id;product;category;price;stock;available
1;Laptop Pro;Electronics;1299.99;45;true
2;Wireless Mouse;Accessories;29.99;150;true
3;USB-C Hub;Accessories;49.99;0;false
4;4K Monitor;Electronics;599.99;23;true
5;Mechanical Keyboard;Accessories;129.99;67;true`;

const SAMPLE_SPECIAL = `"id","full name","email address","company name","notes"
1,"John ""Johnny"" Doe",john@example.com,"Acme, Inc.","Senior developer"
2,"Jane Smith",jane@example.com,"Tech Corp","Handles ""special"" cases"
3,"Bob O'Brien",bob@example.com,"Startup LLC","Loves CSV parsing"`;

// ============================================================
// DELIMITER DETECTION
// ============================================================

function detectDelimiterFromSample(sample) {
  const line = sample.split("\n")[0] || "";
  const candidates = [
    { char: ",",  count: (line.match(/,/g)  || []).length },
    { char: ";",  count: (line.match(/;/g)  || []).length },
    { char: "\t", count: (line.match(/\t/g) || []).length },
    { char: "|",  count: (line.match(/\|/g) || []).length },
  ];
  const best = candidates.reduce((a, b) => (b.count > a.count ? b : a));
  return best.count > 0 ? best.char : ",";
}

function getDelimiterDisplay(val) {
  if (val === "\t")   return "Tab";
  if (val === "auto") return "Auto";
  return val;
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        title={description}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
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
    <button
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 rounded-lg transition-colors"
    >
      {state === "copied" ? (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function StatsBar({ stats, detectedDelimiter }) {
  if (!stats) return null;
  const items = [
    { label: "Records",   value: stats.rowCount?.toLocaleString()    ?? 0 },
    { label: "Columns",   value: stats.columnCount?.toLocaleString() ?? 0 },
    { label: "Delimiter", value: detectedDelimiter === "\t" ? "Tab" : detectedDelimiter },
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

function ColumnPreview({ columns }) {
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

function JsonPreview({ jsonText, maxItems = 2 }) {
  if (!jsonText) return null;
  let parsed;
  try { parsed = JSON.parse(jsonText); } catch { return null; }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const preview = parsed.slice(0, maxItems);
  const hasMore = parsed.length > maxItems;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">JSON Preview</span>
        <span className="text-xs text-gray-400">
          {hasMore ? `Showing ${maxItems} of ${parsed.length} records` : `${parsed.length} record${parsed.length !== 1 ? "s" : ""}`}
        </span>
      </div>
      <div className="divide-y divide-gray-100 bg-white">
        {preview.map((item, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-orange-500 font-mono">[{i}]</span>
              <span className="text-xs text-gray-400">{Object.keys(item).length} fields</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {Object.entries(item).slice(0, 6).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <span className="text-purple-600 font-mono font-semibold flex-shrink-0">{key}:</span>
                  <span className={`font-mono truncate ${
                    val === null ? "text-gray-400 italic"
                    : typeof val === "boolean" ? "text-amber-600"
                    : typeof val === "number"  ? "text-blue-600"
                    : "text-green-600"
                  }`}>
                    {val === null ? "null" : typeof val === "string" ? `"${val}"` : String(val)}
                  </span>
                </div>
              ))}
              {Object.keys(item).length > 6 && (
                <span className="text-xs text-gray-400 italic">+{Object.keys(item).length - 6} more fields...</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty state — clipboard SVG instead of 📋 emoji ──────────
function EmptyState({ onLoad }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[380px] border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-5">
      <div className="w-16 h-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-sm">
        {/* ← was: 📋 emoji */}
        <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <div className="text-center px-6">
        <p className="text-sm font-semibold text-gray-500">Paste CSV data to convert</p>
        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed max-w-xs">
          Supports comma, semicolon, tab and pipe delimiters.
          Auto-detects delimiter, numbers, and booleans.
        </p>
      </div>
    
    </div>
  );
}

function DetectedBadge({ delimiter }) {
  if (!delimiter) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-full">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
      Detected: {getDelimiterDisplay(delimiter)}
    </span>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CsvToJson() {
  const [input,         setInput]         = useState("");
  const [output,        setOutput]        = useState("");
  const [error,         setError]         = useState(null);
  const [stats,         setStats]         = useState(null);
  const [detectedDelim, setDetectedDelim] = useState(null);

  const [delimiter,     setDelimiter]     = useState("auto");
  const [hasHeaders,    setHasHeaders]    = useState(true);
  const [parseNumbers,  setParseNumbers]  = useState(true);
  const [parseBooleans, setParseBooleans] = useState(true);
  const [parseNulls,    setParseNulls]    = useState(true);
  const [indent,        setIndent]        = useState(2);
  const [activeTab,     setActiveTab]     = useState("raw");
  const [autoConvert,   setAutoConvert]   = useState(false);

  useEffect(() => {
    if (!input.trim()) { setDetectedDelim(null); return; }
    setDetectedDelim(detectDelimiterFromSample(input));
  }, [input]);

  const handleConvert = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Input is empty. Please paste CSV data.");
      setOutput(""); setStats(null);
      return;
    }
    const resolvedDelimiter = delimiter === "auto" ? detectDelimiterFromSample(trimmed) : delimiter;
    const result = csvToJson(trimmed, {
      delimiter: resolvedDelimiter,
      hasHeaders, parseNumbers, parseBooleans,
      nullValues: parseNulls ? "null,NULL,N/A,n/a,-" : "",
      indent,
    });
    if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
    else { setOutput(""); setError(result.error); setStats(null); }
  }, [input, delimiter, hasHeaders, parseNumbers, parseBooleans, parseNulls, indent]);

  useEffect(() => {
    if (!autoConvert || !input.trim()) return;
    const t = setTimeout(handleConvert, 500);
    return () => clearTimeout(t);
  }, [input, autoConvert, handleConvert]);

  useEffect(() => {
    if (output) handleConvert();
  }, [delimiter, hasHeaders, parseNumbers, parseBooleans, parseNulls, indent]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleConvert();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleConvert]);

  function handleInputChange(value) { setInput(value); if (error) setError(null); }

  function handleClear() {
    setInput(""); setOutput(""); setError(null); setStats(null); setDetectedDelim(null);
  }

  function loadSample(type) {
    const map = { basic: SAMPLE_BASIC, semicolon: SAMPLE_SEMICOLON, special: SAMPLE_SPECIAL };
    setInput(map[type] || SAMPLE_BASIC);
    setOutput(""); setError(null); setStats(null);
  }

  const inputLines = input ? input.split("\n").filter((l) => l.trim()).length : 0;
  const inputMeta  = input ? `${inputLines} rows · ${input.length.toLocaleString()} chars` : null;
  const outputMeta = output ? `${stats?.rowCount ?? 0} records · ${output.length.toLocaleString()} chars` : null;

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleConvert}
          data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Convert to JSON
        </button>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Delimiter:</label>
          <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-gray-700 cursor-pointer">
            {DELIMITER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500">Indent:</label>
          <select value={indent} onChange={(e) => setIndent(Number(e.target.value))}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-gray-700 cursor-pointer">
            {INDENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <Toggle checked={hasHeaders}   onChange={setHasHeaders}   label="Has headers"    description="First row is column headers" />
        <Toggle checked={parseNumbers}  onChange={setParseNumbers}  label="Parse numbers"  description="Convert numeric strings to numbers" />
        <Toggle checked={parseBooleans} onChange={setParseBooleans} label="Parse booleans" description="Convert true/false strings to booleans" />
        <Toggle checked={parseNulls}    onChange={setParseNulls}    label="Parse nulls"    description="Convert null/NULL/N/A/- to null" />
        <Toggle checked={autoConvert}   onChange={setAutoConvert}   label="Auto convert"   description="Convert automatically as you type" />

        {delimiter === "auto" && detectedDelim && <DetectedBadge delimiter={detectedDelim} />}

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          <button onClick={() => loadSample("basic")} className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 transition-colors whitespace-nowrap">Basic</button>
          <button onClick={() => loadSample("semicolon")} className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 transition-colors whitespace-nowrap">Semicolon</button>
          <button onClick={() => loadSample("special")} className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 transition-colors whitespace-nowrap">Quoted fields</button>
        </div>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input panel */}
        <div className="flex flex-col">
          <PanelHeader
            label="CSV Input"
            meta={inputMeta}
            actions={input && (
              <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">Clear</button>
            )}
          />
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={`Paste CSV data here...\n\nname,age,city\nAlice,30,New York\nBob,25,London`}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[360px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        {/* Output panel */}
        <div className="flex flex-col">
          <PanelHeader
            label="JSON Output"
            meta={outputMeta}
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
                <button
                  onClick={() => downloadText(output, "data.json", "application/json")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download .json
                </button>
              </>
            )}
          />

          <div className="flex-1 relative border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[360px]">
            {output ? (
              activeTab === "raw" ? (
                <textarea
                  value={output}
                  readOnly
                  spellCheck={false}
                  className="w-full h-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[360px] text-gray-800 cursor-default select-all"
                />
              ) : (
                <div className="p-3 overflow-auto min-h-[360px]">
                  <JsonPreview jsonText={output} maxItems={3} />
                </div>
              )
            ) : !error ? (
              <EmptyState onLoad={loadSample} />
            ) : (
              // ── Error state — triangle SVG instead of ⚠️ emoji ──
              <div className="flex flex-col items-center justify-center min-h-[360px] gap-3 p-6">
                <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <p className="text-xs text-red-500 font-mono text-center leading-relaxed break-all max-w-sm">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────── */}
      <ErrorBanner message={error} />

      {/* ── Stats bar ────────────────────────────────────────── */}
      <StatsBar stats={stats} detectedDelimiter={delimiter === "auto" ? detectedDelim : delimiter} />

      {/* ── Column preview ───────────────────────────────────── */}
      {stats?.columns && <ColumnPreview columns={stats.columns} />}

    </div>
  );
}