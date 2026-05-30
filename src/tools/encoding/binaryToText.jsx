"use client";

import { useState, useCallback, useEffect } from "react";
import { binaryToText, textToBinary } from "@/utils/encoders";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// CONSTANTS
// ============================================================

const SEPARATOR_OPTIONS = [
  { value: " ",  label: "Space"   },
  { value: ",",  label: "Comma"   },
  { value: "\n", label: "Newline" },
  { value: "",   label: "None"    },
];

// ============================================================
// HELPERS
// ============================================================

function countBits(str) {
  if (!str.trim()) return { bytes: 0, bits: 0 };
  const tokens = str.trim().split(/[\s,]+/).filter(Boolean);
  return { bytes: tokens.length, bits: tokens.length * 8 };
}

function isValidBinary(str) {
  const cleaned = str.replace(/[\s,]/g, "");
  return cleaned.length > 0 && /^[01]+$/.test(cleaned);
}

function highlightBinaryGroups(binary) {
  if (!binary) return [];
  return binary.trim().split(/\s+/).filter(Boolean).map((byte, i) => ({
    bits: byte,
    index: i,
    isValid: /^[01]{8}$/.test(byte),
    charCode: /^[01]{8}$/.test(byte) ? parseInt(byte, 2) : null,
  }));
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Mode tabs — SVG icons instead of 💾/📝 emojis ────────────
function ModeTabs({ mode, onChange }) {
  const tabs = [
    { value: "binary-to-text", label: "Binary → Text" },
    { value: "text-to-binary", label: "Text → Binary" },
  ];

  const icons = {
    "binary-to-text": (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    "text-to-binary": (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
      {tabs.map((tab) => (
        <button key={tab.value} onClick={() => onChange(tab.value)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
            mode === tab.value
              ? "bg-white text-blue-700 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}>
          {icons[tab.value]}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} title={description}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${checked ? "bg-blue-600" : "bg-gray-300"}`}>
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
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
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

function CopyButton({ text, label = "Copy" }) {
  const [state, setState] = useState("idle");
  async function handleCopy() {
    if (!text) return;
    const ok = await copyToClipboard(text);
    setState(ok ? "copied" : "error");
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button onClick={handleCopy} disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors">
      {state === "copied" ? (
        <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span className="text-green-600">Copied!</span></>
      ) : (
        <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>{label}</>
      )}
    </button>
  );
}

function StatsBar({ stats, mode }) {
  if (!stats) return null;
  const items = mode === "binary-to-text"
    ? [
        { label: "Bytes decoded", value: stats.byteCount?.toLocaleString()    ?? 0 },
        { label: "Bits",          value: stats.bitCount?.toLocaleString()     ?? 0 },
        { label: "Output chars",  value: stats.outputLength?.toLocaleString() ?? 0 },
      ]
    : [
        { label: "Chars encoded", value: stats.charCount?.toLocaleString()    ?? 0 },
        { label: "Bytes",         value: stats.byteCount?.toLocaleString()    ?? 0 },
        { label: "Output bits",   value: stats.bitCount?.toLocaleString()     ?? 0 },
        { label: "Output length", value: `${stats.outputLength?.toLocaleString() ?? 0} chars` },
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

function BinaryVisualizer({ binary }) {
  const groups = highlightBinaryGroups(binary);
  if (!groups.length) return null;
  const MAX_DISPLAY = 32;
  const displayed   = groups.slice(0, MAX_DISPLAY);
  const hasMore     = groups.length > MAX_DISPLAY;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Byte Visualizer</span>
        <span className="text-xs text-gray-400">
          {groups.length} byte{groups.length !== 1 ? "s" : ""}
          {hasMore && ` · showing first ${MAX_DISPLAY}`}
        </span>
      </div>
      <div className="p-3 bg-white">
        <div className="flex flex-wrap gap-1.5">
          {displayed.map((group, i) => (
            <div key={i}
              title={group.charCode !== null ? `Decimal: ${group.charCode} | Char: ${group.charCode >= 32 && group.charCode < 127 ? String.fromCharCode(group.charCode) : "(non-printable)"}` : "Invalid byte"}
              className={`group relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border cursor-default transition-colors ${
                group.isValid ? "bg-blue-50 border-blue-200 hover:bg-blue-100" : "bg-red-50 border-red-200"
              }`}>
              <span className={`text-xs font-mono font-bold tracking-wider ${group.isValid ? "text-blue-700" : "text-red-600"}`}>
                {group.bits}
              </span>
              {group.charCode !== null && <span className="text-xs font-mono text-gray-400">{group.charCode}</span>}
              {group.charCode !== null && group.charCode >= 32 && group.charCode < 127 && (
                <span className="text-xs font-semibold text-green-600">{String.fromCharCode(group.charCode)}</span>
              )}
            </div>
          ))}
          {hasMore && (
            <div className="flex items-center px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
              <span className="text-xs text-gray-400 font-medium">+{groups.length - MAX_DISPLAY} more</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" />Binary
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="font-mono text-gray-400">42</span>Decimal
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="font-mono text-green-500">A</span>Character
        </div>
      </div>
    </div>
  );
}

function ValidationBadge({ input, mode }) {
  if (!input.trim() || mode !== "binary-to-text") return null;
  const valid = isValidBinary(input);
  const { bytes } = countBits(input);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
      valid ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${valid ? "bg-green-500" : "bg-red-500"}`} />
      {valid ? `${bytes} valid byte${bytes !== 1 ? "s" : ""}` : "Invalid binary"}
    </span>
  );
}

// ── Empty output — SVG instead of 📝/💾 emojis ───────────────
function EmptyOutput({ mode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center opacity-40">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </div>
      <p className="text-xs text-gray-300">
        {mode === "binary-to-text" ? "Decoded text appears here" : "Binary output appears here"}
      </p>
    </div>
  );
}

function BinaryCheatSheet() {
  const chars = [
    { char: "A", bin: "01000001", dec: 65  },
    { char: "a", bin: "01100001", dec: 97  },
    { char: "0", bin: "00110000", dec: 48  },
    { char: " ", bin: "00100000", dec: 32  },
    { char: "!", bin: "00100001", dec: 33  },
    { char: ".", bin: "00101110", dec: 46  },
    { char: "Z", bin: "01011010", dec: 90  },
    { char: "z", bin: "01111010", dec: 122 },
  ];
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quick Reference</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Char", "Binary", "Decimal"].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {chars.map((row) => (
              <tr key={row.char} className="hover:bg-blue-50 transition-colors cursor-default">
                <td className="px-4 py-2 font-mono font-bold text-blue-700">{row.char === " " ? "SP" : row.char}</td>
                <td className="px-4 py-2 font-mono text-green-700 tracking-wider">{row.bin}</td>
                <td className="px-4 py-2 font-mono text-gray-600">{row.dec}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function BinaryToText() {
  const [mode,        setMode]        = useState("binary-to-text");
  const [input,       setInput]       = useState("");
  const [output,      setOutput]      = useState("");
  const [error,       setError]       = useState(null);
  const [stats,       setStats]       = useState(null);
  const [separator,   setSeparator]   = useState(" ");
  const [autoConvert, setAutoConvert] = useState(true);
  const [showVisual,  setShowVisual]  = useState(true);
  const [showRef,     setShowRef]     = useState(false);

  const handleProcess = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError(mode === "binary-to-text" ? "Please enter binary code to decode." : "Please enter text to convert to binary.");
      setOutput(""); setStats(null); return;
    }

    if (mode === "binary-to-text") {
      const cleaned = trimmed.replace(/[\s,]/g, "");
      if (!/^[01]+$/.test(cleaned)) {
        setError("Invalid binary input. Only 0s and 1s are allowed. Spaces and commas are used as separators.");
        setOutput(""); setStats(null); return;
      }
      const result = binaryToText(trimmed);
      if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
      else { setOutput(""); setError(result.error); setStats(null); }
    } else {
      const result = textToBinary(trimmed, { separator });
      if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
      else { setOutput(""); setError(result.error); setStats(null); }
    }
  }, [input, mode, separator]);

  useEffect(() => {
    if (!autoConvert || !input.trim()) return;
    const t = setTimeout(handleProcess, 300);
    return () => clearTimeout(t);
  }, [input, autoConvert, handleProcess]);

  useEffect(() => {
    if (input.trim() && output) handleProcess();
  }, [separator]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleProcess();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleProcess]);

  function handleModeChange(newMode) { setMode(newMode); setInput(""); setOutput(""); setError(null); setStats(null); }
  function handleSwap() {
    if (!output) return;
    const newMode = mode === "binary-to-text" ? "text-to-binary" : "binary-to-text";
    setMode(newMode); setInput(output); setOutput(""); setError(null); setStats(null);
  }
  function handleClear() { setInput(""); setOutput(""); setError(null); setStats(null); }

  const { bytes } = countBits(mode === "binary-to-text" ? input : output);
  const inputMeta  = input.trim() ? mode === "binary-to-text" ? `${countBits(input).bytes} bytes · ${input.trim().length.toLocaleString()} chars` : `${input.length.toLocaleString()} chars` : null;
  const outputMeta = output ? mode === "binary-to-text" ? `${output.length} chars decoded` : `${countBits(output).bytes} bytes · ${output.length.toLocaleString()} chars` : null;

  return (
    <div className="space-y-5">

      <ModeTabs mode={mode} onChange={handleModeChange} />

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleProcess} data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {mode === "binary-to-text" ? "Decode Binary" : "Encode to Binary"}
        </button>

        {mode === "text-to-binary" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Separator:</span>
            <select value={separator} onChange={(e) => setSeparator(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-gray-700 cursor-pointer transition-colors">
              {SEPARATOR_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        <Toggle checked={autoConvert} onChange={setAutoConvert} label="Auto convert"    description="Convert automatically as you type" />
        {mode === "binary-to-text" && (
          <Toggle checked={showVisual} onChange={setShowVisual} label="Byte visualizer" description="Show visual byte breakdown" />
        )}
        <ValidationBadge input={input} mode={mode} />

        {output && (
          <button onClick={handleSwap}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg transition-all cursor-pointer">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Swap
          </button>
        )}

        {(input || output) && (
          <button onClick={handleClear}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer transition-colors">
            Clear
          </button>
        )}

        <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
        </div>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <PanelHeader label={mode === "binary-to-text" ? "Binary Input" : "Text Input"} meta={inputMeta}
            actions={input && <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
          />
          <textarea value={input} onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
            placeholder={mode === "binary-to-text"
              ? "Paste binary code here...\n\n01001000 01100101 01101100 01101100 01101111\n\nAccepts:\n• 8-bit groups separated by spaces\n• Comma-separated bytes\n• Continuous binary string"
              : "Type or paste text here...\n\nHello, World!\n\nOutput will be 8-bit binary groups."}
            spellCheck={false} autoCorrect="off" autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[260px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        <div className="flex flex-col">
          <PanelHeader label={mode === "binary-to-text" ? "Text Output" : "Binary Output"} meta={outputMeta}
            actions={<>
              {output && <CopyButton text={output} />}
              {output && (
                <button onClick={() => downloadText(output, mode === "binary-to-text" ? "decoded.txt" : "binary.txt", "text/plain")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
              )}
            </>}
          />
          <div className="relative flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[260px]">
            <textarea value={output} readOnly spellCheck={false}
              className="w-full h-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[260px] text-gray-800 cursor-default select-all whitespace-pre-wrap break-all"
            />
            {!output && !error && <EmptyOutput mode={mode} />}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      <StatsBar stats={stats} mode={mode} />

      {showVisual && mode === "binary-to-text" && input.trim() && isValidBinary(input) && <BinaryVisualizer binary={input} />}
      {showVisual && mode === "text-to-binary" && output && <BinaryVisualizer binary={output} />}

      {/* ── Reference table toggle ───────────────────────────── */}
      <div className="border-t border-gray-100 pt-4">
        <button onClick={() => setShowRef((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 rounded-xl cursor-pointer transition-all w-full justify-center">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
          </svg>
          {showRef ? "Hide" : "Show"} Quick Reference
          <svg width="14" height="14" className={`transition-transform ${showRef ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showRef && <div className="mt-3"><BinaryCheatSheet /></div>}
      </div>

    </div>
  );
}