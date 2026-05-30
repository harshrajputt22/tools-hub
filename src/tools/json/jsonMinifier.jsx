"use client";

import { useState, useCallback, useEffect } from "react";
import { minifyJson, formatJson } from "@/utils/formatters";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// HELPERS
// ============================================================

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getSizeInBytes(str) {
  return new TextEncoder().encode(str).length;
}

function calcSavings(original, minified) {
  const origBytes = getSizeInBytes(original);
  const miniBytes = getSizeInBytes(minified);
  const saved     = origBytes - miniBytes;
  const pct       = origBytes > 0 ? Math.round((saved / origBytes) * 100) : 0;
  return { origBytes, miniBytes, saved, pct };
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

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

function SizeComparisonBar({ original, minified }) {
  if (!original || !minified) return null;
  const { origBytes, miniBytes, saved, pct } = calcSavings(original, minified);
  const miniPct = origBytes > 0 ? Math.round((miniBytes / origBytes) * 100) : 100;

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Size Reduction</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-bold text-green-700">
          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {pct}% smaller
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Original</span>
          <span className="font-mono font-semibold text-gray-600">{formatBytes(origBytes)}</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gray-400 rounded-full w-full" />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
          <span>Minified</span>
          <span className="font-mono font-semibold text-green-600">{formatBytes(miniBytes)}</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${miniPct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          { label: "Original", value: formatBytes(origBytes), color: "text-gray-700"  },
          { label: "Minified", value: formatBytes(miniBytes), color: "text-green-600" },
          { label: "Saved",    value: formatBytes(saved),     color: "text-blue-600"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BeautifyOptions({ indent, onIndentChange, onBeautify }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
      <svg width="14" height="14" className="text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
      <span className="text-xs font-medium text-gray-500">Restore formatting:</span>
      <div className="flex items-center gap-1 p-0.5 bg-white border border-gray-200 rounded-lg">
        {[{ value: 2, label: "2" }, { value: 4, label: "4" }, { value: "tab", label: "Tab" }].map((opt) => (
          <button key={opt.value} onClick={() => onIndentChange(opt.value)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${indent === opt.value ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>
            {opt.label}
          </button>
        ))}
      </div>
      <button onClick={onBeautify}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-700 rounded-lg transition-all">
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Beautify output
      </button>
    </div>
  );
}

// ── Empty state — compress SVG instead of 🗜️ emoji ───────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] gap-3">
      <div className="w-14 h-14 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-300">Minified output will appear here</p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JsonMinifier() {
  const [input,          setInput]          = useState("");
  const [output,         setOutput]         = useState("");
  const [error,          setError]          = useState(null);
  const [beautifyIndent, setBeautifyIndent] = useState(2);
  const [autoMinify,     setAutoMinify]     = useState(false);
  const [isBeautified,   setIsBeautified]   = useState(false);

  const handleMinify = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) { setError("Input is empty. Please paste valid JSON."); setOutput(""); return; }
    const result = minifyJson(trimmed);
    if (result.success) { setOutput(result.output); setError(null); setIsBeautified(false); }
    else { setOutput(""); setError(result.error); }
  }, [input]);

  function handleBeautify() {
    const src = output || input;
    if (!src.trim()) return;
    const result = formatJson(src, { indent: beautifyIndent });
    if (result.success) { setOutput(result.output); setError(null); setIsBeautified(true); }
    else { setError(result.error); }
  }

  useEffect(() => {
    if (!autoMinify || !input.trim()) return;
    const t = setTimeout(handleMinify, 400);
    return () => clearTimeout(t);
  }, [input, autoMinify, handleMinify]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleMinify();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleMinify]);

  function handleInputChange(value) { setInput(value); if (error) setError(null); if (isBeautified) setIsBeautified(false); }
  function handleClear()            { setInput(""); setOutput(""); setError(null); setIsBeautified(false); }
  function handleSwap()             { if (!output) return; setInput(output); setOutput(""); setError(null); setIsBeautified(false); }

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars · ${input.split("\n").length} lines` : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars${isBeautified ? " · beautified" : " · minified"}` : null;
  const showSizeBar = input && output && !isBeautified;

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleMinify} data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          Minify JSON
        </button>

        {output && (
          <button onClick={handleSwap}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-lg transition-all">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Use as input
          </button>
        )}

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <button role="switch" aria-checked={autoMinify} onClick={() => setAutoMinify((v) => !v)}
            className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 ${autoMinify ? "bg-blue-600" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${autoMinify ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <span className="text-xs font-medium text-gray-600">Auto minify</span>
        </label>

        {(input || output) && (
          <button onClick={handleClear}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors">
            Clear all
          </button>
        )}

        <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
          <span>to minify</span>
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
            placeholder="Paste formatted JSON here..."
            spellCheck={false} autoCorrect="off" autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[340px] focus:border-blue-400 transition-colors placeholder:text-gray-300"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader
            label={isBeautified ? "Beautified Output" : "Minified Output"}
            meta={outputMeta}
            actions={output && (
              <>
                <CopyButton text={output} />
                <button
                  onClick={() => downloadText(output, isBeautified ? "formatted.json" : "minified.json", "application/json")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
              </>
            )}
          />
          <div className="relative flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[340px]">
            {output ? (
              <textarea value={output} readOnly spellCheck={false}
                className={`w-full h-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[340px] text-gray-800 cursor-default select-all ${isBeautified ? "whitespace-pre" : "whitespace-pre-wrap break-all"}`}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      {showSizeBar && <SizeComparisonBar original={input} minified={output} />}
      {output && <BeautifyOptions indent={beautifyIndent} onIndentChange={setBeautifyIndent} onBeautify={handleBeautify} />}

    </div>
  );
}