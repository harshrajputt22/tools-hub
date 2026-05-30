"use client";

import { useState, useCallback, useEffect } from "react";
import { jsonToXml } from "@/utils/converters";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// CONSTANTS
// ============================================================

const INDENT_OPTIONS = [
  { value: 2, label: "2 spaces" },
  { value: 4, label: "4 spaces" },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );
}

function PanelHeader({ label, charCount, lineCount, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        {charCount > 0 && (
          <span className="text-xs text-gray-400 tabular-nums">
            {charCount.toLocaleString()} chars
            {lineCount > 1 && ` · ${lineCount.toLocaleString()} lines`}
          </span>
        )}
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

function StatsBar({ inputLen, outputLen, outputLines }) {
  const items = [
    { label: "Input",     value: `${inputLen.toLocaleString()} chars`  },
    { label: "Output",    value: `${outputLen.toLocaleString()} chars` },
    { label: "XML lines", value: outputLines.toLocaleString()          },
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

// ── Empty overlay — document SVG instead of 📄 emoji ─────────
function EmptyOverlay({ message }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center opacity-40">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-xs text-gray-300">{message}</p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JsonToXml() {
  const [input,       setInput]       = useState("");
  const [output,      setOutput]      = useState("");
  const [error,       setError]       = useState(null);
  const [stats,       setStats]       = useState(null);
  const [rootElement, setRootElement] = useState("root");
  const [itemElement, setItemElement] = useState("item");
  const [indent,      setIndent]      = useState(2);
  const [declaration, setDeclaration] = useState(true);

  const handleConvert = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Input is empty. Please paste valid JSON.");
      setOutput("");
      setStats(null);
      return;
    }
    const result = jsonToXml(trimmed, {
      rootElement: rootElement.trim() || "root",
      itemElement: itemElement.trim() || "item",
      indent,
      declaration,
    });
    if (result.success) {
      setOutput(result.output);
      setError(null);
      setStats(result.stats);
    } else {
      setOutput("");
      setError(result.error);
      setStats(null);
    }
  }, [input, rootElement, itemElement, indent, declaration]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleConvert();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleConvert]);

  function handleInputChange(value) {
    setInput(value);
    if (error) setError(null);
  }

  function handleClear() {
    setInput("");
    setOutput("");
    setError(null);
    setStats(null);
  }

  function handleDownload() {
    if (!output) return;
    downloadText(output, "output.xml", "application/xml");
  }

  const inputLines  = input  ? input.split("\n").length  : 0;
  const outputLines = output ? output.split("\n").length : 0;

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
          Convert to XML
        </button>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Root tag:</label>
          <input
            type="text"
            value={rootElement}
            onChange={(e) => setRootElement(e.target.value)}
            placeholder="root"
            className="w-24 px-2.5 py-1.5 text-xs font-mono bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-gray-700"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Item tag:</label>
          <input
            type="text"
            value={itemElement}
            onChange={(e) => setItemElement(e.target.value)}
            placeholder="item"
            className="w-24 px-2.5 py-1.5 text-xs font-mono bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-gray-700"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500">Indent:</label>
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-gray-700 cursor-pointer"
          >
            {INDENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <Toggle checked={declaration} onChange={setDeclaration} label="XML declaration" />

        {(input || output) && (
          <button
            onClick={handleClear}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors"
          >
            Clear
          </button>
        )}

        <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">↵</kbd>
          <span>to convert</span>
        </div>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="flex flex-col">
          <PanelHeader
            label="JSON Input"
            charCount={input.length}
            lineCount={inputLines}
            actions={
              input && (
                <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                  Clear
                </button>
              )
            }
          />
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={`Paste JSON here...\n\n{\n  "name": "DevTools",\n  "version": "1.0.0"\n}`}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[340px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
          />
        </div>

        <div className="flex flex-col">
          <PanelHeader
            label="XML Output"
            charCount={output.length}
            lineCount={outputLines}
            actions={
              <>
                {output && <CopyButton text={output} />}
                {output && (
                  <button onClick={handleDownload} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </button>
                )}
              </>
            }
          />
          <div className="relative flex-1">
            <textarea
              value={output}
              readOnly
              placeholder="XML output will appear here..."
              spellCheck={false}
              className="w-full h-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[340px] text-gray-800 cursor-default select-all placeholder:text-gray-300 placeholder:font-sans"
            />
            {!output && !error && <EmptyOverlay message="XML output appears here" />}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />

      {stats && (
        <StatsBar
          inputLen={stats.inputLength ?? 0}
          outputLen={stats.outputLength ?? 0}
          outputLines={stats.outputLines ?? 0}
        />
      )}
    </div>
  );
}