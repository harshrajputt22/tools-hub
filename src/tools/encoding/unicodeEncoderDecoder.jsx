"use client";

import { useState, useCallback, useEffect } from "react";
import { encodeUnicode, decodeUnicode } from "@/utils/encoders";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// CONSTANTS
// ============================================================

const SAMPLES = {
  encode: "Hello, World! 🌍\nCafé & Résumé\n日本語 • العربية • हिन्दी\n© 2024 DevTools™",
  decode: {
    js:     "\\u0048\\u0065\\u006C\\u006C\\u006F\\u002C\\u0020\\u0057\\u006F\\u0072\\u006C\\u0064\\u0021",
    css:    "\\48 \\65 \\6C \\6C \\6F",
    html:   "&#72;&#101;&#108;&#108;&#111;&#44;&#32;&#87;&#111;&#114;&#108;&#100;&#33;",
    python: "\\u0048\\u0065\\u006c\\u006c\\u006f",
  },
};

const FORMAT_OPTIONS = [
  {
    value:   "js",
    label:   "JavaScript",
    example: "\\u0048\\u0065\\u006C",
    desc:    "ES6 \\uXXXX format",
    color:   "text-yellow-600",
    bg:      "bg-yellow-50 border-yellow-200",
    active:  "bg-yellow-500 text-white",
  },
  {
    value:   "css",
    label:   "CSS",
    example: "\\48 \\65 \\6C",
    desc:    "CSS \\HH format",
    color:   "text-blue-600",
    bg:      "bg-blue-50 border-blue-200",
    active:  "bg-blue-500 text-white",
  },
  {
    value:   "html",
    label:   "HTML",
    example: "&#72;&#101;&#108;",
    desc:    "HTML &#NNN; entities",
    color:   "text-orange-600",
    bg:      "bg-orange-50 border-orange-200",
    active:  "bg-orange-500 text-white",
  },
  {
    value:   "python",
    label:   "Python",
    example: "\\u0048\\u0065\\u006c",
    desc:    "Python \\uXXXX format",
    color:   "text-green-600",
    bg:      "bg-green-50 border-green-200",
    active:  "bg-green-500 text-white",
  },
  {
    value:   "codepoints",
    label:   "Code points",
    example: "U+0048 U+0065 U+006C",
    desc:    "Unicode U+XXXX format",
    color:   "text-purple-600",
    bg:      "bg-purple-50 border-purple-200",
    active:  "bg-purple-500 text-white",
  },
];

// ============================================================
// HELPERS
// ============================================================

function getFormatOption(value) {
  return FORMAT_OPTIONS.find((f) => f.value === value) || FORMAT_OPTIONS[0];
}

function getCodePoint(char) {
  const cp = char.codePointAt(0);
  return {
    decimal: cp,
    hex:     cp.toString(16).toUpperCase().padStart(4, "0"),
    unicode: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
    name:    getUnicodeName(cp),
    block:   getUnicodeBlock(cp),
    isEmoji: cp > 0x1F000,
    isBMP:   cp <= 0xFFFF,
  };
}

function getUnicodeName(cp) {
  if (cp >= 0x0041 && cp <= 0x005A) return `Latin Capital Letter ${String.fromCodePoint(cp)}`;
  if (cp >= 0x0061 && cp <= 0x007A) return `Latin Small Letter ${String.fromCodePoint(cp)}`;
  if (cp >= 0x0030 && cp <= 0x0039) return `Digit ${String.fromCodePoint(cp)}`;
  if (cp === 0x0020) return "Space";
  if (cp === 0x000A) return "Line Feed";
  if (cp === 0x000D) return "Carriage Return";
  if (cp === 0x0021) return "Exclamation Mark";
  if (cp === 0x0022) return "Quotation Mark";
  if (cp === 0x0026) return "Ampersand";
  if (cp === 0x0027) return "Apostrophe";
  if (cp === 0x002C) return "Comma";
  if (cp === 0x002E) return "Full Stop";
  if (cp >= 0x1F600 && cp <= 0x1F64F) return "Emoticons";
  if (cp >= 0x1F300 && cp <= 0x1F5FF) return "Misc Symbols & Pictographs";
  if (cp >= 0x1F900 && cp <= 0x1F9FF) return "Supplemental Symbols";
  if (cp >= 0x4E00  && cp <= 0x9FFF)  return "CJK Unified Ideographs";
  if (cp >= 0x0600  && cp <= 0x06FF)  return "Arabic";
  if (cp >= 0x0900  && cp <= 0x097F)  return "Devanagari";
  if (cp >= 0x00C0  && cp <= 0x024F)  return "Latin Extended";
  return "Unicode Character";
}

function getUnicodeBlock(cp) {
  if (cp <= 0x007F)  return "Basic Latin";
  if (cp <= 0x00FF)  return "Latin-1 Supplement";
  if (cp <= 0x024F)  return "Latin Extended";
  if (cp <= 0x036F)  return "Combining Diacritical Marks";
  if (cp <= 0x03FF)  return "Greek & Coptic";
  if (cp <= 0x04FF)  return "Cyrillic";
  if (cp <= 0x06FF)  return "Arabic";
  if (cp <= 0x097F)  return "Devanagari";
  if (cp <= 0x0FFF)  return "Various Asian Scripts";
  if (cp <= 0x9FFF)  return "CJK Unified Ideographs";
  if (cp <= 0xFFFF)  return "BMP (Basic Multilingual Plane)";
  if (cp <= 0x1FFFF) return "Supplementary Multilingual Plane";
  return "Higher Planes";
}

function getUniqueChars(str) {
  if (!str) return [];
  const seen  = new Set();
  const chars = [];
  for (const char of str) {
    if (!seen.has(char)) {
      seen.add(char);
      chars.push(char);
    }
  }
  return chars.slice(0, 48);
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Mode tabs ─────────────────────────────────────────────────
function ModeTabs({ mode, onChange }) {
  const tabs = [
    { value: "encode", label: "Encode", icon: "🔡", desc: "Text → Unicode" },
    { value: "decode", label: "Decode", icon: "📝", desc: "Unicode → Text" },
  ];

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
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
          <span
            className={`text-xs font-normal hidden sm:inline ${
              mode === tab.value ? "text-blue-400" : "text-gray-400"
            }`}
          >
            {tab.desc}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Format selector ───────────────────────────────────────────
function FormatSelector({ value, onChange, mode }) {
  const current = getFormatOption(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
          Format:
        </span>
        <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg flex-wrap">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              title={`${opt.desc} · e.g. ${opt.example}`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                value === opt.value
                  ? `${opt.active} shadow-sm`
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Format example badge */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${current.bg}`}
      >
        <span className={`font-semibold ${current.color}`}>
          {current.label}:
        </span>
        <code className={`font-mono ${current.color}`}>
          {current.example}
        </code>
        <span className="text-gray-400">— {current.desc}</span>
      </div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────
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

// ── Panel header ──────────────────────────────────────────────
function PanelHeader({ label, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        {meta && (
          <span className="text-xs text-gray-400 tabular-nums">{meta}</span>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1.5">{actions}</div>
      )}
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
      <svg
        width="14"
        height="14"
        className="flex-shrink-0 mt-0.5 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-xs font-mono text-red-700 leading-relaxed break-all">
        {message}
      </p>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────
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

// ── Stats bar ─────────────────────────────────────────────────
function StatsBar({ stats, mode }) {
  if (!stats) return null;

  const items =
    mode === "encode"
      ? [
          { label: "Characters",  value: stats.charCount?.toLocaleString() ?? 0    },
          { label: "Code points", value: stats.codePointCount?.toLocaleString() ?? 0 },
          { label: "Non-ASCII",   value: stats.nonAsciiCount?.toLocaleString() ?? 0  },
          { label: "Output",      value: `${stats.outputLength?.toLocaleString() ?? 0} chars` },
        ]
      : [
          { label: "Sequences",   value: stats.sequenceCount?.toLocaleString() ?? 0  },
          { label: "Output chars",value: stats.outputLength?.toLocaleString() ?? 0   },
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

// ── Code point inspector ──────────────────────────────────────
function CodePointInspector({ text }) {
  const [selected, setSelected] = useState(null);

  if (!text) return null;

  const chars = getUniqueChars(text);
  const total = [...text].length;

  if (chars.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Code Point Inspector
        </span>
        <span className="text-xs text-gray-400">
          {[...text].length} code points · {chars.length} unique
          {[...text].length > 48 && " · showing first 48"}
        </span>
      </div>

      {/* Character grid */}
      <div className="p-3 bg-white">
        <div className="flex flex-wrap gap-1.5">
          {chars.map((char, i) => {
            const info    = getCodePoint(char);
            const isMulti = char.length > 1; // surrogate pair
            const isSelected = selected === char;

            return (
              <button
                key={i}
                onClick={() => setSelected(isSelected ? null : char)}
                title={`${info.unicode} — ${info.name}`}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-purple-600 border-purple-600 shadow-md scale-105"
                    : info.isEmoji
                    ? "bg-yellow-50 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300"
                    : info.isBMP
                    ? "bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300"
                    : "bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                }`}
              >
                {/* Character */}
                <span
                  className={`text-base font-bold leading-tight ${
                    isSelected ? "text-white" : "text-gray-800"
                  }`}
                >
                  {char === " " ? "·" : char === "\n" ? "↵" : char}
                </span>
                {/* Code point */}
                <span
                  className={`text-xs font-mono leading-none ${
                    isSelected ? "text-purple-200" : "text-gray-400"
                  }`}
                >
                  {info.unicode}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected char detail panel */}
      {selected && (() => {
        const info = getCodePoint(selected);
        return (
          <div className="border-t border-gray-200 bg-purple-50 p-4">
            <div className="flex items-start gap-4">
              {/* Big char display */}
              <div className="w-16 h-16 bg-white border border-purple-200 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm">
                {selected === " " ? "·" : selected === "\n" ? "↵" : selected}
              </div>

              {/* Details grid */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: "Character", value: selected === " " ? "Space" : selected === "\n" ? "Newline" : selected },
                  { label: "Unicode",   value: info.unicode,               mono: true  },
                  { label: "Decimal",   value: info.decimal.toLocaleString(), mono: true },
                  { label: "Hex",       value: `0x${info.hex}`,            mono: true  },
                  { label: "Block",     value: info.block                               },
                  { label: "Name",      value: info.name                                },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <p className="text-xs text-purple-500 font-medium mb-0.5">
                      {label}
                    </p>
                    <p
                      className={`text-xs font-semibold text-purple-900 break-all ${
                        mono ? "font-mono" : ""
                      }`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Close */}
              <button
                onClick={() => setSelected(null)}
                className="flex-shrink-0 text-purple-400 hover:text-purple-600 cursor-pointer transition-colors p-1 rounded-lg hover:bg-purple-100"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded bg-purple-100 border border-purple-200 inline-block" />
          BMP (U+0000–U+FFFF)
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200 inline-block" />
          Emoji / Supplementary
        </div>
        <span className="text-xs text-gray-400 ml-auto">
          Click any character for details
        </span>
      </div>
    </div>
  );
}

// ── Non-ASCII only notice ─────────────────────────────────────
function NonAsciiNotice({ text, nonAsciiOnly, onToggle }) {
  if (!text) return null;

  const total    = [...text].length;
  const nonAscii = [...text].filter((c) => c.codePointAt(0) > 127).length;

  if (nonAscii === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
      <svg
        width="14"
        height="14"
        className="flex-shrink-0 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-xs text-blue-700 flex-1">
        <strong>{nonAscii}</strong> non-ASCII character{nonAscii !== 1 ? "s" : ""} out of{" "}
        <strong>{total}</strong> total.
        {!nonAsciiOnly && " Enable Non-ASCII only to encode only those characters."}
      </p>
      <button
        onClick={onToggle}
        className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
          nonAsciiOnly
            ? "bg-blue-600 text-white"
            : "bg-white text-blue-700 border border-blue-300 hover:bg-blue-50"
        }`}
      >
        {nonAsciiOnly ? "All chars" : "Non-ASCII only"}
      </button>
    </div>
  );
}

// ── Empty output ──────────────────────────────────────────────
function EmptyOutput({ mode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <span className="text-3xl opacity-20">
        {mode === "encode" ? "🔡" : "📝"}
      </span>
      <p className="text-xs text-gray-300">
        {mode === "encode"
          ? "Unicode encoded output appears here"
          : "Decoded text appears here"}
      </p>
    </div>
  );
}

// ── Format samples ────────────────────────────────────────────
function FormatSamples({ onLoad, mode }) {
  if (mode !== "decode") return null;

  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
        Decode samples:
      </span>
      {FORMAT_OPTIONS.slice(0, 4).map((fmt) => (
        <button
          key={fmt.value}
          onClick={() => onLoad(fmt.value)}
          title={`Load ${fmt.label} sample`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-all ${fmt.bg} ${fmt.color}`}
        >
          {fmt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function UnicodeTool() {
  const [mode,         setMode]         = useState("encode");
  const [input,        setInput]        = useState("");
  const [output,       setOutput]       = useState("");
  const [error,        setError]        = useState(null);
  const [stats,        setStats]        = useState(null);
  const [format,       setFormat]       = useState("js");
  const [nonAsciiOnly, setNonAsciiOnly] = useState(false);
  const [autoConvert,  setAutoConvert]  = useState(true);
  const [showInspector,setShowInspector]= useState(true);

  // ── Process handler ─────────────────────────────────────────
  const handleProcess = useCallback(() => {
    const trimmed = input.trim();

    if (!trimmed) {
      setError(
        mode === "encode"
          ? "Please enter text to encode."
          : "Please enter Unicode sequences to decode."
      );
      setOutput("");
      setStats(null);
      return;
    }

    if (mode === "encode") {
      const result = encodeUnicode(trimmed, {
        format,
        nonAsciiOnly,
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
    } else {
      const result = decodeUnicode(trimmed, { format });

      if (result.success) {
        setOutput(result.output);
        setError(null);
        setStats(result.stats);
      } else {
        setOutput("");
        setError(result.error);
        setStats(null);
      }
    }
  }, [input, mode, format, nonAsciiOnly]);

  // ── Auto convert ────────────────────────────────────────────
  useEffect(() => {
    if (!autoConvert || !input.trim()) return;
    const t = setTimeout(handleProcess, 300);
    return () => clearTimeout(t);
  }, [input, autoConvert, handleProcess]);

  // ── Re-run when options change ───────────────────────────────
  useEffect(() => {
    if (input.trim() && output) handleProcess();
  }, [format, nonAsciiOnly]);

  // ── Ctrl/Cmd + Enter ────────────────────────────────────────
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleProcess();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleProcess]);

  // ── Mode change ──────────────────────────────────────────────
  function handleModeChange(newMode) {
    setMode(newMode);
    setInput("");
    setOutput("");
    setError(null);
    setStats(null);
  }

  // ── Swap ────────────────────────────────────────────────────
  function handleSwap() {
    if (!output) return;
    const newMode = mode === "encode" ? "decode" : "encode";
    setMode(newMode);
    setInput(output);
    setOutput("");
    setError(null);
    setStats(null);
  }

  // ── Clear ────────────────────────────────────────────────────
  function handleClear() {
    setInput("");
    setOutput("");
    setError(null);
    setStats(null);
  }

  // ── Sample ───────────────────────────────────────────────────
  function handleSample(fmt) {
    if (mode === "encode") {
      setInput(SAMPLES.encode);
    } else {
      const sample = SAMPLES.decode[fmt || format];
      if (sample) setInput(sample);
    }
    setOutput("");
    setError(null);
    setStats(null);
  }

  // ── Derived ──────────────────────────────────────────────────
  const charCount   = [...(input || "")].length;
  const nonAsciiCt  = [...(input || "")].filter((c) => c.codePointAt(0) > 127).length;

  const inputMeta = input
    ? mode === "encode"
      ? `${charCount.toLocaleString()} chars · ${nonAsciiCt} non-ASCII`
      : `${input.length.toLocaleString()} chars`
    : null;

  const outputMeta = output
    ? `${output.length.toLocaleString()} chars`
    : null;

  const inspectorText = mode === "encode" ? input : output;

  return (
    <div className="space-y-5">

      {/* ── Mode selector ────────────────────────────────────── */}
      <ModeTabs mode={mode} onChange={handleModeChange} />

      {/* ── Format selector ──────────────────────────────────── */}
      <FormatSelector
        value={format}
        onChange={setFormat}
        mode={mode}
      />

      {/* ── Options toolbar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">

        {/* Process button */}
        <button
          onClick={handleProcess}
          data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <svg
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          {mode === "encode" ? "Encode Unicode" : "Decode Unicode"}
        </button>

        {/* Non-ASCII only (encode) */}
        {mode === "encode" && (
          <Toggle
            checked={nonAsciiOnly}
            onChange={setNonAsciiOnly}
            label="Non-ASCII only"
            description="Only encode characters with code point > 127"
          />
        )}

        {/* Auto convert */}
        <Toggle
          checked={autoConvert}
          onChange={setAutoConvert}
          label="Auto convert"
          description="Convert automatically as you type"
        />

        {/* Inspector toggle */}
        <Toggle
          checked={showInspector}
          onChange={setShowInspector}
          label="Code point inspector"
          description="Show interactive character code point panel"
        />

        {/* Swap */}
        {output && (
          <button
            onClick={handleSwap}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg transition-all cursor-pointer"
          >
            <svg
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
            Swap &amp; {mode === "encode" ? "decode" : "encode"}
          </button>
        )}

        {/* Sample */}
        <button
          onClick={() => handleSample()}
          className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 cursor-pointer transition-colors"
        >
          Sample
        </button>

        {/* Clear */}
        {(input || output) && (
          <button
            onClick={handleClear}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer transition-colors"
          >
            Clear
          </button>
        )}

        {/* Kbd hint */}
        <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
        </div>
      </div>

      {/* ── Format decode samples ─────────────────────────────── */}
      <FormatSamples onLoad={handleSample} mode={mode} />

      {/* ── Non-ASCII notice ─────────────────────────────────── */}
      {mode === "encode" && (
        <NonAsciiNotice
          text={input}
          nonAsciiOnly={nonAsciiOnly}
          onToggle={() => setNonAsciiOnly((v) => !v)}
        />
      )}

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input */}
        <div className="flex flex-col">
          <PanelHeader
            label={mode === "encode" ? "Text Input" : "Unicode Sequences"}
            meta={inputMeta}
            actions={
              input && (
                <button
                  onClick={handleClear}
                  className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )
            }
          />
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder={
              mode === "encode"
                ? "Type or paste text to encode...\n\nSupports all Unicode:\n• Emoji: 🌍 🎉 ❤️\n• Arabic: العربية\n• Japanese: 日本語\n• Devanagari: हिन्दी\n• Latin extended: Café Résumé"
                : `Paste Unicode sequences to decode...\n\nExamples by format:\n• JS:     \\u0048\\u0065\\u006C\\u006C\\u006F\n• CSS:    \\48 \\65 \\6C \\6C \\6F\n• HTML:   &#72;&#101;&#108;&#108;&#111;\n• Python: \\u0048\\u0065\\u006c\\u006c\\u006f`
            }
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[280px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader
            label={mode === "encode" ? "Encoded Output" : "Decoded Text"}
            meta={outputMeta}
            actions={
              <>
                {output && <CopyButton text={output} />}
                {output && (
                  <button
                    onClick={() =>
                      downloadText(
                        output,
                        mode === "encode"
                          ? `encoded-${format}.txt`
                          : "decoded.txt",
                        "text/plain"
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <svg
                      width="12"
                      height="12"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download
                  </button>
                )}
              </>
            }
          />
          <div className="relative flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[280px]">
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              className="w-full h-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[280px] text-gray-800 cursor-default select-all whitespace-pre-wrap break-all"
            />
            {!output && !error && <EmptyOutput mode={mode} />}
          </div>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────── */}
      <ErrorBanner message={error} />

      {/* ── Stats ────────────────────────────────────────────── */}
      <StatsBar stats={stats} mode={mode} />

      {/* ── Code point inspector ─────────────────────────────── */}
      {showInspector && inspectorText && (
        <CodePointInspector text={inspectorText} />
      )}

     
    </div>
  );
}