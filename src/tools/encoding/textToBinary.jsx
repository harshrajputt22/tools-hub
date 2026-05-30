"use client";

import { useState, useCallback, useEffect } from "react";
import { textToBinary, binaryToText } from "@/utils/encoders";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// CONSTANTS
// ============================================================

const SEPARATOR_OPTIONS = [
  { value: " ",  label: "Space",        example: "01001000 01100101" },
  { value: ",",  label: "Comma",        example: "01001000,01100101" },
  { value: "\n", label: "Newline",      example: "01001000\n01100101"},
  { value: "-",  label: "Dash",         example: "01001000-01100101" },
  { value: "",   label: "No separator", example: "0100100001100101"  },
];

// ============================================================
// HELPERS
// ============================================================

function countBytes(text) {
  if (!text) return 0;
  return new TextEncoder().encode(text).length;
}

function countBinaryBytes(binaryStr) {
  if (!binaryStr.trim()) return 0;
  return binaryStr.trim().split(/[\s,\-]+/).filter(Boolean).length;
}

function isValidBinaryInput(str) {
  const cleaned = str.replace(/[\s,\-]/g, "");
  return cleaned.length > 0 && /^[01]+$/.test(cleaned);
}

function getBitGroups(binaryStr) {
  if (!binaryStr.trim()) return [];
  return binaryStr.trim().split(/\s+/).filter(Boolean).slice(0, 64).map((byte, i) => {
    const isValid  = /^[01]{8}$/.test(byte);
    const charCode = isValid ? parseInt(byte, 2) : null;
    const char     = charCode !== null && charCode >= 32 && charCode < 127 ? String.fromCharCode(charCode) : null;
    return { byte, isValid, charCode, char, index: i };
  });
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Mode tabs — SVG icons instead of 📝/💾 emojis ────────────
function ModeTabs({ mode, onChange }) {
  const tabs = [
    { value: "text-to-binary", label: "Text → Binary" },
    { value: "binary-to-text", label: "Binary → Text" },
  ];
  const icons = {
    "text-to-binary": (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    "binary-to-text": (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  };
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
      {tabs.map((tab) => (
        <button key={tab.value} onClick={() => onChange(tab.value)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
            mode === tab.value ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
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

function SeparatorSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Separator:</span>
      <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
        {SEPARATOR_OPTIONS.map((opt) => (
          <button key={opt.label} onClick={() => onChange(opt.value)} title={`Example: ${opt.example}`}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              value === opt.value ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatsBar({ stats, mode, input, output }) {
  if (!stats || !output) return null;
  const items = mode === "text-to-binary"
    ? [
        { label: "Characters", value: stats.charCount?.toLocaleString()    ?? 0 },
        { label: "Bytes",      value: stats.byteCount?.toLocaleString()    ?? 0 },
        { label: "Bits",       value: stats.bitCount?.toLocaleString()     ?? 0 },
        { label: "Output",     value: `${stats.outputLength?.toLocaleString() ?? 0} chars` },
      ]
    : [
        { label: "Bytes decoded", value: stats.byteCount?.toLocaleString()    ?? 0 },
        { label: "Bits",          value: stats.bitCount?.toLocaleString()     ?? 0 },
        { label: "Output chars",  value: stats.outputLength?.toLocaleString() ?? 0 },
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

function BitPatternVisualizer({ binaryStr, mode }) {
  const groups = getBitGroups(binaryStr);
  if (!groups.length) return null;
  const totalBytes = mode === "text-to-binary"
    ? binaryStr.trim().split(/\s+/).filter(Boolean).length
    : countBinaryBytes(binaryStr);
  const hasMore = totalBytes > 64;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bit Pattern Visualizer</span>
        <span className="text-xs text-gray-400">
          {totalBytes} byte{totalBytes !== 1 ? "s" : ""}{hasMore && ` · first 64 shown`}
        </span>
      </div>
      <div className="p-4 bg-white space-y-3">
        {groups.map((group) => (
          <div key={group.index} className="flex items-center gap-3">
            <span className="text-xs font-mono text-gray-300 w-6 text-right flex-shrink-0">{group.index}</span>
            <div className="flex items-center gap-0.5">
              {group.byte.padStart(8, "0").split("").map((bit, bi) => (
                <div key={bi}
                  className={`w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded transition-colors ${bi === 4 ? "ml-1" : ""} ${
                    bit === "1" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}>
                  {bit}
                </div>
              ))}
            </div>
            {group.charCode !== null && <span className="text-xs font-mono text-gray-500 w-8 flex-shrink-0">{group.charCode}</span>}
            {group.char && <span className="text-xs font-semibold text-green-600 w-4 flex-shrink-0">{group.char}</span>}
            {group.charCode !== null && !group.char && <span className="text-xs text-gray-300 italic">NP</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 px-4 py-2.5 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-4 h-4 rounded bg-blue-600" /><span>1 (set bit)</span></div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-4 h-4 rounded bg-gray-100 border border-gray-200" /><span>0 (clear bit)</span></div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="font-mono text-gray-500">65</span><span>Decimal</span></div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="font-mono text-green-600">A</span><span>Character</span></div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="text-gray-300 italic">NP</span><span>Non-printable</span></div>
      </div>
    </div>
  );
}

function ValidationBadge({ input, mode }) {
  if (!input.trim() || mode !== "binary-to-text") return null;
  const valid = isValidBinaryInput(input);
  const bytes = countBinaryBytes(input);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
      valid ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${valid ? "bg-green-500" : "bg-red-500"}`} />
      {valid ? `${bytes} byte${bytes !== 1 ? "s" : ""} · ${bytes * 8} bits` : "Invalid binary"}
    </span>
  );
}

// ── Empty output — SVG instead of 💾/📝 emojis ───────────────
function EmptyOutput({ mode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center opacity-40">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </div>
      <p className="text-xs text-gray-300">
        {mode === "text-to-binary" ? "Binary output appears here" : "Decoded text appears here"}
      </p>
    </div>
  );
}

function QuickReference() {
  const rows = [
    { char: "A",  dec: 65,  bin: "01000001" },
    { char: "B",  dec: 66,  bin: "01000010" },
    { char: "Z",  dec: 90,  bin: "01011010" },
    { char: "a",  dec: 97,  bin: "01100001" },
    { char: "z",  dec: 122, bin: "01111010" },
    { char: "0",  dec: 48,  bin: "00110000" },
    { char: "9",  dec: 57,  bin: "00111001" },
    { char: " ",  dec: 32,  bin: "00100000" },
    { char: "!",  dec: 33,  bin: "00100001" },
    { char: "@",  dec: 64,  bin: "01000000" },
    { char: "\n", dec: 10,  bin: "00001010" },
    { char: "\t", dec: 9,   bin: "00001001" },
  ];
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Binary Quick Reference</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Char", "Decimal", "Binary (8-bit)"].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-blue-50 transition-colors cursor-default">
                <td className="px-4 py-2 font-mono font-bold text-blue-700">
                  {row.char === "\n" ? "\\n" : row.char === "\t" ? "\\t" : row.char === " " ? "SP" : row.char}
                </td>
                <td className="px-4 py-2 font-mono text-gray-600">{row.dec}</td>
                <td className="px-4 py-2 font-mono text-green-700 tracking-wider">{row.bin}</td>
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

export default function TextToBinary() {
  const [mode,        setMode]        = useState("text-to-binary");
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
      setError(mode === "text-to-binary" ? "Please enter text to convert to binary." : "Please enter binary code to decode.");
      setOutput(""); setStats(null); return;
    }
    if (mode === "text-to-binary") {
      const result = textToBinary(trimmed, { separator });
      if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
      else { setOutput(""); setError(result.error); setStats(null); }
    } else {
      const cleaned = trimmed.replace(/[\s,\-]/g, "");
      if (!/^[01]+$/.test(cleaned)) {
        setError("Invalid binary input. Only 0s and 1s are allowed. Spaces, commas, and dashes are accepted as separators.");
        setOutput(""); setStats(null); return;
      }
      const result = binaryToText(trimmed);
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
    if (input.trim() && output && mode === "text-to-binary") handleProcess();
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
    const newMode = mode === "text-to-binary" ? "binary-to-text" : "text-to-binary";
    setMode(newMode); setInput(output); setOutput(""); setError(null); setStats(null);
  }
  function handleClear() { setInput(""); setOutput(""); setError(null); setStats(null); }

  const inputMeta  = input.trim() ? mode === "text-to-binary" ? `${input.length.toLocaleString()} chars · ${countBytes(input)} bytes` : `${countBinaryBytes(input)} bytes · ${countBinaryBytes(input) * 8} bits` : null;
  const outputMeta = output ? mode === "text-to-binary" ? `${countBinaryBytes(output)} bytes · ${output.length.toLocaleString()} chars` : `${output.length.toLocaleString()} chars decoded` : null;
  const visualizerStr = mode === "text-to-binary" ? output : input;

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
          {mode === "text-to-binary" ? "Convert to Binary" : "Decode Binary"}
        </button>

        {mode === "text-to-binary" && <SeparatorSelector value={separator} onChange={setSeparator} />}

        <Toggle checked={autoConvert} onChange={setAutoConvert} label="Auto convert"   description="Convert automatically as you type" />
        <Toggle checked={showVisual}  onChange={setShowVisual}  label="Bit visualizer" description="Show visual bit-by-bit breakdown" />
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
          <PanelHeader label={mode === "text-to-binary" ? "Text Input" : "Binary Input"} meta={inputMeta}
            actions={input && <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
          />
          <textarea value={input} onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
            placeholder={mode === "text-to-binary"
              ? "Type or paste text to convert...\n\nExamples:\n• Hello, World!\n• Any Unicode text\n• Multi-line content\n\nEach character becomes 8 binary digits."
              : "Paste binary code to decode...\n\nExamples:\n• 01001000 01100101 01101100 01101100\n• 01001000,01100101,01101100\n• 01001000-01100101-01101100\n\nAccepts: spaces, commas, dashes as separators."}
            spellCheck={false} autoCorrect="off" autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[260px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        <div className="flex flex-col">
          <PanelHeader label={mode === "text-to-binary" ? "Binary Output" : "Decoded Text"} meta={outputMeta}
            actions={<>
              {output && <CopyButton text={output} />}
              {output && (
                <button onClick={() => downloadText(output, mode === "text-to-binary" ? "binary.txt" : "decoded.txt", "text/plain")}
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
      <StatsBar stats={stats} mode={mode} input={input} output={output} />
      {showVisual && visualizerStr && <BitPatternVisualizer binaryStr={visualizerStr} mode={mode} />}

      {/* ── Quick reference toggle ───────────────────────────── */}
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
        {showRef && <div className="mt-3"><QuickReference /></div>}
      </div>

    </div>
  );
}