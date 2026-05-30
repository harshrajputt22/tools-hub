"use client";

import { useState, useCallback, useEffect } from "react";
import { encodeHex, decodeHex } from "@/utils/encoders";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// CONSTANTS
// ============================================================

const FORMAT_PRESETS = [
  { value: " ",  label: "Space",        example: "48 65 6C"   },
  { value: "",   label: "No separator", example: "48656C"     },
  { value: ":",  label: "Colon",        example: "48:65:6C"   },
  { value: "-",  label: "Dash",         example: "48-65-6C"   },
  { value: "\n", label: "Newline",      example: "48\n65\n6C" },
];

const PREFIX_OPTIONS = [
  { value: "",    label: "None"   },
  { value: "0x",  label: "0x"     },
  { value: "\\x", label: "\\x"    },
  { value: "%",   label: "% (URL)"},
];

// ============================================================
// HELPERS
// ============================================================

function countHexBytes(str) {
  if (!str.trim()) return 0;
  const cleaned = str
    .replace(/0x/gi, "")
    .replace(/\\x/gi, "")
    .replace(/%/g, "")
    .replace(/[\s:\-,]/g, "");
  return Math.floor(cleaned.length / 2);
}

function isValidHexInput(str) {
  const cleaned = str
    .replace(/0x/gi, "")
    .replace(/\\x/gi, "")
    .replace(/%/g, "")
    .replace(/[\s,:\-]/g, "");
  return cleaned.length > 0 && /^[0-9a-fA-F]*$/.test(cleaned);
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Mode tabs — SVG icons instead of 🔡/📝 emojis ────────────
function ModeTabs({ mode, onChange }) {
  const tabs = [
    { value: "encode", label: "Encode", desc: "Text → Hex" },
    { value: "decode", label: "Decode", desc: "Hex → Text" },
  ];

  const icons = {
    encode: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    decode: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
            mode === tab.value
              ? "bg-white text-blue-700 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          {icons[tab.value]}
          <span>{tab.label}</span>
          <span className={`text-xs font-normal hidden sm:inline ${mode === tab.value ? "text-blue-400" : "text-gray-400"}`}>
            {tab.desc}
          </span>
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        title={description}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
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
    <button
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors"
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
          {label}
        </>
      )}
    </button>
  );
}

function StatsBar({ stats, mode }) {
  if (!stats) return null;
  const items = mode === "encode"
    ? [
        { label: "Input chars", value: stats.inputLength?.toLocaleString()  ?? 0 },
        { label: "Bytes",       value: stats.byteCount?.toLocaleString()    ?? 0 },
        { label: "Output",      value: `${stats.outputLength?.toLocaleString() ?? 0} chars` },
        { label: "Case",        value: stats.uppercase ? "Uppercase" : "Lowercase" },
      ]
    : [
        { label: "Hex bytes", value: stats.byteCount?.toLocaleString()    ?? 0 },
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

function HexColorPreview({ hexOutput }) {
  if (!hexOutput) return null;
  const cleaned = hexOutput.replace(/[\s:\-]/g, "").replace(/0x/gi, "");
  if (cleaned.length !== 6 && cleaned.length !== 8) return null;
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) return null;
  const colorHex = `#${cleaned.slice(0, 6)}`;
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl">
      <div
        className="w-10 h-10 rounded-xl border border-gray-200 shadow-sm flex-shrink-0"
        style={{ backgroundColor: colorHex }}
      />
      <div>
        <p className="text-xs font-semibold text-gray-700">Color Preview</p>
        <p className="text-xs font-mono text-gray-500 mt-0.5">{colorHex.toUpperCase()}</p>
      </div>
      <CopyButton text={colorHex.toUpperCase()} label="Copy hex color" />
    </div>
  );
}

function HexVisualizer({ hexString, uppercase }) {
  if (!hexString) return null;
  const cleaned = hexString
    .replace(/0x/gi, "")
    .replace(/\\x/gi, "")
    .replace(/%/g, "")
    .replace(/[\s,:\-]/g, "");
  if (!cleaned || cleaned.length % 2 !== 0) return null;

  const MAX_DISPLAY = 48;
  const pairs = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    const hex  = cleaned.slice(i, i + 2);
    const dec  = parseInt(hex, 16);
    const char = dec >= 32 && dec < 127 ? String.fromCharCode(dec) : null;
    pairs.push({ hex: uppercase ? hex.toUpperCase() : hex.toLowerCase(), dec, char });
    if (pairs.length >= MAX_DISPLAY) break;
  }
  const totalBytes = cleaned.length / 2;
  const hasMore    = totalBytes > MAX_DISPLAY;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hex Byte Visualizer</span>
        <span className="text-xs text-gray-400">
          {totalBytes} byte{totalBytes !== 1 ? "s" : ""}
          {hasMore && ` · showing first ${MAX_DISPLAY}`}
        </span>
      </div>
      <div className="p-3 bg-white">
        <div className="flex flex-wrap gap-1.5">
          {pairs.map((pair, i) => (
            <div
              key={i}
              title={`Decimal: ${pair.dec}${pair.char ? ` | Char: ${pair.char}` : ""}`}
              className="flex flex-col items-center gap-0.5 px-2.5 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg cursor-default transition-colors"
            >
              <span className="text-xs font-mono font-bold text-indigo-700 tracking-wider">{pair.hex}</span>
              <span className="text-xs font-mono text-gray-400">{pair.dec}</span>
              {pair.char && <span className="text-xs font-semibold text-green-600">{pair.char}</span>}
            </div>
          ))}
          {hasMore && (
            <div className="flex items-center px-3 py-2 rounded-lg bg-gray-100 border border-gray-200">
              <span className="text-xs text-gray-400 font-medium">+{totalBytes - MAX_DISPLAY} more</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-200 inline-block" />
          Hex
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="font-mono text-gray-400">65</span>
          Decimal
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="font-mono text-green-500">A</span>
          Character
        </div>
      </div>
    </div>
  );
}

function ValidationBadge({ input, mode }) {
  if (!input.trim() || mode !== "decode") return null;
  const valid = isValidHexInput(input);
  const bytes = countHexBytes(input);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
      valid ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${valid ? "bg-green-500" : "bg-red-500"}`} />
      {valid ? `${bytes} valid byte${bytes !== 1 ? "s" : ""}` : "Invalid hex"}
    </span>
  );
}

// ── Empty output — SVG instead of 🔡/📝 emojis ───────────────
function EmptyOutput({ mode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center opacity-40">
        {mode === "encode" ? (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        )}
      </div>
      <p className="text-xs text-gray-300">
        {mode === "encode" ? "Hex encoded output appears here" : "Decoded text appears here"}
      </p>
    </div>
  );
}

function HexReferenceTable() {
  const rows = [
    { char: "A–Z",   hex: "41–5A", dec: "65–90",  note: "Uppercase letters" },
    { char: "a–z",   hex: "61–7A", dec: "97–122", note: "Lowercase letters" },
    { char: "0–9",   hex: "30–39", dec: "48–57",  note: "Digits"            },
    { char: "Space", hex: "20",    dec: "32",      note: "Space character"   },
    { char: "!",     hex: "21",    dec: "33",      note: "Exclamation mark"  },
    { char: `"`,     hex: "22",    dec: "34",      note: "Double quote"      },
    { char: "#",     hex: "23",    dec: "35",      note: "Hash / pound"      },
    { char: "$",     hex: "24",    dec: "36",      note: "Dollar sign"       },
    { char: "&",     hex: "26",    dec: "38",      note: "Ampersand"         },
    { char: "@",     hex: "40",    dec: "64",      note: "At sign"           },
    { char: "\\n",   hex: "0A",    dec: "10",      note: "Newline (LF)"      },
    { char: "\\r",   hex: "0D",    dec: "13",      note: "Carriage return"   },
    { char: "\\t",   hex: "09",    dec: "9",       note: "Tab"               },
    { char: "NULL",  hex: "00",    dec: "0",       note: "Null character"    },
  ];
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Common Hex Values</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Char", "Hex", "Decimal", "Note"].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={row.hex} className="hover:bg-indigo-50 transition-colors cursor-default">
                <td className="px-4 py-2 font-mono font-bold text-indigo-700">{row.char}</td>
                <td className="px-4 py-2 font-mono text-indigo-600 uppercase">{row.hex}</td>
                <td className="px-4 py-2 font-mono text-gray-600">{row.dec}</td>
                <td className="px-4 py-2 text-gray-400">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormatPresets({ separator, onSelect }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {FORMAT_PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onSelect(preset.value)}
          title={`Example: ${preset.example}`}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-all ${
            separator === preset.value
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function HexTool() {
  const [mode,        setMode]        = useState("encode");
  const [input,       setInput]       = useState("");
  const [output,      setOutput]      = useState("");
  const [error,       setError]       = useState(null);
  const [stats,       setStats]       = useState(null);

  // Encode options
  const [separator,   setSeparator]   = useState(" ");
  const [uppercase,   setUppercase]   = useState(true);
  const [prefix,      setPrefix]      = useState("");

  // UI state
  const [autoConvert, setAutoConvert] = useState(true);
  const [showVisual,  setShowVisual]  = useState(true);
  const [showRef,     setShowRef]     = useState(false);

  const handleProcess = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError(mode === "encode" ? "Please enter text to encode." : "Please enter hex string to decode.");
      setOutput(""); setStats(null); return;
    }

    if (mode === "encode") {
      const result = encodeHex(trimmed, { separator, uppercase, prefix });
      if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
      else { setOutput(""); setError(result.error); setStats(null); }
    } else {
      if (!isValidHexInput(trimmed)) {
        setError("Invalid hex input. Only hex characters (0-9, A-F) and separators are allowed.");
        setOutput(""); setStats(null); return;
      }
      const result = decodeHex(trimmed);
      if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
      else { setOutput(""); setError(result.error); setStats(null); }
    }
  }, [input, mode, separator, uppercase, prefix]);

  useEffect(() => {
    if (!autoConvert || !input.trim()) return;
    const t = setTimeout(handleProcess, 300);
    return () => clearTimeout(t);
  }, [input, autoConvert, handleProcess]);

  useEffect(() => {
    if (input.trim() && output) handleProcess();
  }, [separator, uppercase, prefix]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleProcess();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleProcess]);

  function handleModeChange(newMode) {
    setMode(newMode); setInput(""); setOutput(""); setError(null); setStats(null);
  }

  function handleSwap() {
    if (!output) return;
    const newMode = mode === "encode" ? "decode" : "encode";
    setMode(newMode); setInput(output); setOutput(""); setError(null); setStats(null);
  }

  function handleClear() {
    setInput(""); setOutput(""); setError(null); setStats(null);
  }

  const inputMeta = input.trim()
    ? mode === "encode"
      ? `${input.length.toLocaleString()} chars`
      : `${countHexBytes(input)} bytes`
    : null;

  const outputMeta = output
    ? mode === "encode"
      ? `${countHexBytes(output)} bytes · ${output.length.toLocaleString()} chars`
      : `${output.length.toLocaleString()} chars decoded`
    : null;

  const visualizerHex  = mode === "encode" ? output : input;
  const colorPreviewHex = mode === "encode" ? output : null;

  return (
    <div className="space-y-5">

      {/* ── Mode selector ────────────────────────────────────── */}
      <ModeTabs mode={mode} onChange={handleModeChange} />

      {/* ── Options toolbar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">

        <button
          onClick={handleProcess}
          data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {mode === "encode" ? "Encode to Hex" : "Decode from Hex"}
        </button>

        {mode === "encode" && (
          <>
            <Toggle checked={uppercase} onChange={setUppercase} label="Uppercase" description="Use uppercase hex digits (A-F vs a-f)" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Prefix:</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                {PREFIX_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPrefix(opt.value)}
                    title={`Add ${opt.label} prefix to each byte`}
                    className={`px-2.5 py-1.5 text-xs font-mono font-semibold rounded-md transition-all cursor-pointer ${
                      prefix === opt.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <Toggle checked={autoConvert} onChange={setAutoConvert} label="Auto convert"    description="Convert automatically as you type" />
        <Toggle checked={showVisual}  onChange={setShowVisual}  label="Byte visualizer" description="Show hex byte breakdown panel" />
        <ValidationBadge input={input} mode={mode} />

        {output && (
          <button
            onClick={handleSwap}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg transition-all cursor-pointer"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Swap &amp; {mode === "encode" ? "decode" : "encode"}
          </button>
        )}

        {(input || output) && (
          <button
            onClick={handleClear}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer transition-colors"
          >
            Clear
          </button>
        )}

        <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
        </div>
      </div>

      {/* ── Separator presets (encode mode) ──────────────────── */}
      {mode === "encode" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl">
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Separator:</span>
          <FormatPresets separator={separator} onSelect={setSeparator} />
        </div>
      )}

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input */}
        <div className="flex flex-col">
          <PanelHeader
            label={mode === "encode" ? "Text Input" : "Hex Input"}
            meta={inputMeta}
            actions={
              input && (
                <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">
                  Clear
                </button>
              )
            }
          />
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
            placeholder={
              mode === "encode"
                ? "Type or paste text to encode...\n\nExamples:\n• Hello, World!\n• Any Unicode text \n• Special characters"
                : "Paste hex string to decode...\n\nAccepted formats:\n• 48 65 6C 6C 6F  (space separated)\n• 48:65:6C:6C:6F  (colon separated)\n• 0x48 0x65 0x6C  (0x prefixed)\n• 48656C6C6F       (continuous)"
            }
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[260px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader
            label={mode === "encode" ? "Hex Output" : "Decoded Text"}
            meta={outputMeta}
            actions={
              <>
                {output && <CopyButton text={output} />}
                {output && (
                  <button
                    onClick={() => downloadText(output, mode === "encode" ? "encoded.hex" : "decoded.txt", "text/plain")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </button>
                )}
              </>
            }
          />
          <div className="relative flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[260px]">
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              className="w-full h-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[260px] text-gray-800 cursor-default select-all whitespace-pre-wrap break-all"
            />
            {!output && !error && <EmptyOutput mode={mode} />}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      <StatsBar stats={stats} mode={mode} />

      {showVisual && visualizerHex && (
        <HexVisualizer hexString={visualizerHex} uppercase={uppercase} />
      )}

      {colorPreviewHex && <HexColorPreview hexOutput={colorPreviewHex} />}

      {/* ── Reference table toggle ───────────────────────────── */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={() => setShowRef((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 rounded-xl cursor-pointer transition-all w-full justify-center"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
          </svg>
          {showRef ? "Hide" : "Show"} Hex Reference Table
          <svg width="14" height="14" className={`transition-transform ${showRef ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showRef && <div className="mt-3"><HexReferenceTable /></div>}
      </div>

    </div>
  );
}