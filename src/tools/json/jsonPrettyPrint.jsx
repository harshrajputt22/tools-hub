"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { formatJson } from "@/utils/formatters";
import { copyToClipboard, downloadText } from "@/lib/helpers";

const INDENT_PRESETS = [
  { value: 2,     label: "2 spaces", preview: "··"   },
  { value: 4,     label: "4 spaces", preview: "····" },
  { value: "tab", label: "Tabs",     preview: "→"    },
];

function getLineCount(str) { return str ? str.split("\n").length : 0; }
function getCharCount(str) { return str ? str.length : 0; }

function calcSizeChange(original, formatted) {
  const origLen = original.trim().length;
  const fmtLen  = formatted.trim().length;
  const diff    = fmtLen - origLen;
  const pct     = origLen > 0 ? Math.abs(Math.round((diff / origLen) * 100)) : 0;
  return { diff, pct, larger: diff > 0 };
}

// ── Indent selector ───────────────────────────────────────────
function IndentSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Indent:</span>
      <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
        {INDENT_PRESETS.map((preset) => (
          <button key={preset.value} onClick={() => onChange(preset.value)} title={preset.label}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              value === preset.value ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
            }`}>
            <span className="font-mono text-xs">{preset.preview}</span>
            <span className="hidden sm:inline">{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

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

function LineNumbers({ text, visible }) {
  if (!visible || !text) return null;
  const lines = text.split("\n").length;
  return (
    <div className="select-none text-right pr-3 pt-3.5 pb-3.5 text-xs font-mono text-gray-300 leading-relaxed bg-gray-50 border-r border-gray-200 min-w-[44px] overflow-hidden flex-shrink-0" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i + 1} className="leading-relaxed">{i + 1}</div>
      ))}
    </div>
  );
}

function StatsRow({ input, output }) {
  if (!output) return null;
  const { diff, pct, larger } = calcSizeChange(input, output);
  const outputLines = getLineCount(output);
  const outputChars = getCharCount(output);
  const items = [
    { label: "Lines",       value: outputLines.toLocaleString(), color: "text-blue-600" },
    { label: "Characters",  value: outputChars.toLocaleString(), color: "text-gray-700" },
    { label: "Size change", value: diff === 0 ? "No change" : `${larger ? "+" : "-"}${pct}% ${larger ? "larger" : "smaller"}`,
      color: diff === 0 ? "text-gray-500" : larger ? "text-amber-600" : "text-green-600" },
  ];
  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {items.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className={`font-mono font-semibold ${color}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function DiffIndicator({ input, output, sortKeys }) {
  if (!input || !output) return null;
  let origParsed, outParsed;
  try { origParsed = JSON.parse(input); outParsed = JSON.parse(output); } catch { return null; }
  const identical = JSON.stringify(origParsed) === JSON.stringify(outParsed);
  if (!identical && !sortKeys) return null;
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium ${identical ? "bg-green-50 border-green-200 text-green-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {identical ? "Output is semantically identical to input — only formatting changed" : "Keys have been sorted alphabetically — values unchanged"}
    </div>
  );
}

// ── Empty state — print SVG instead of 🖨️ emoji ──────────────
function EmptyState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center opacity-40">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </div>
      <p className="text-xs font-medium text-gray-300">Pretty output appears here</p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JsonPrettyPrint() {
  const [input,      setInput]      = useState("");
  const [output,     setOutput]     = useState("");
  const [error,      setError]      = useState(null);
  const [indent,     setIndent]     = useState(2);
  const [sortKeys,   setSortKeys]   = useState(false);
  const [showLines,  setShowLines]  = useState(true);
  const [autoFormat, setAutoFormat] = useState(true);
  const outputRef = useRef(null);

  const handleFormat = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) { setError("Input is empty. Please paste valid JSON."); setOutput(""); return; }
    const result = formatJson(trimmed, { indent, sortKeys });
    if (result.success) { setOutput(result.output); setError(null); }
    else { setOutput(""); setError(result.error); }
  }, [input, indent, sortKeys]);

  useEffect(() => {
    if (!autoFormat || !input.trim()) return;
    const t = setTimeout(handleFormat, 350);
    return () => clearTimeout(t);
  }, [input, autoFormat, handleFormat]);

  useEffect(() => {
    if (input.trim() && output) handleFormat();
  }, [indent, sortKeys]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleFormat();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleFormat]);

  function handleOutputScroll(e) {
    const gutter = e.currentTarget.previousSibling;
    if (gutter) gutter.scrollTop = e.currentTarget.scrollTop;
  }

  function handleInputChange(value) { setInput(value); if (error) setError(null); }
  function handleClear()            { setInput(""); setOutput(""); setError(null); }
  function handleSwap()             { if (!output) return; setInput(output); setOutput(""); setError(null); }

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars` : null;
  const outputMeta = output ? `${getLineCount(output).toLocaleString()} lines · ${getCharCount(output).toLocaleString()} chars` : null;

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleFormat} data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Pretty Print
        </button>

        <IndentSelector value={indent} onChange={setIndent} />
        <Toggle checked={sortKeys}   onChange={setSortKeys}   label="Sort keys"     description="Sort all object keys alphabetically" />
        <Toggle checked={showLines}  onChange={setShowLines}  label="Line numbers"  description="Show line numbers in output" />
        <Toggle checked={autoFormat} onChange={setAutoFormat} label="Auto format"   description="Format automatically as you type" />

        {output && (
          <button onClick={handleSwap}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-lg transition-all">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Use as input
          </button>
        )}

        {(input || output) && (
          <button onClick={handleClear}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors">
            Clear
          </button>
        )}

        <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
          <span>to format</span>
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
            placeholder="Paste minified or unformatted JSON..."
            spellCheck={false} autoCorrect="off" autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[360px] focus:border-blue-400 transition-colors placeholder:text-gray-300"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader label="Pretty Output" meta={outputMeta}
            actions={output && (
              <>
                <CopyButton text={output} />
                <button onClick={() => downloadText(output, "pretty.json", "application/json")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
              </>
            )}
          />
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[360px] relative">
            {output && showLines && <LineNumbers text={output} visible={showLines} />}
            {output ? (
              <textarea ref={outputRef} value={output} readOnly spellCheck={false}
                onScroll={showLines ? handleOutputScroll : undefined}
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[360px] text-gray-800 cursor-default select-all"
              />
            ) : (
              <div className="flex-1 relative"><EmptyState /></div>
            )}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      {output && <DiffIndicator input={input} output={output} sortKeys={sortKeys} />}
      <StatsRow input={input} output={output} />
    </div>
  );
}