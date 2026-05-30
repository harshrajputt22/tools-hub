"use client";

import { useState, useCallback, useEffect } from "react";
import { textToAscii, asciiToText } from "@/utils/encoders";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// CONSTANTS
// ============================================================

const FORMAT_OPTIONS = [
  { value: "decimal", label: "Decimal",  example: "72 101 108" },
  { value: "hex",     label: "Hex",      example: "48 65 6C"   },
  { value: "octal",   label: "Octal",    example: "110 145 154" },
  { value: "binary",  label: "Binary",   example: "01001000…"  },
];

const SEPARATOR_OPTIONS = [
  { value: " ",  label: "Space"        },
  { value: ",",  label: "Comma"        },
  { value: ", ", label: "Comma + space"},
  { value: "\n", label: "Newline"      },
  { value: "-",  label: "Dash"         },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Section heading — SVG icons instead of emoji ─────────────
function SectionHeading({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
      <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

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

function FormatSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Format:</span>
      <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            title={`Example: ${opt.example}`}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              value === opt.value
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatsBar({ stats }) {
  if (!stats) return null;
  const items = [
    { label: "Characters", value: stats.charCount?.toLocaleString()    ?? 0 },
    { label: "Format",     value: stats.format                         ?? "—" },
    { label: "Input",      value: `${stats.inputLength?.toLocaleString()  ?? 0} chars` },
    { label: "Output",     value: `${stats.outputLength?.toLocaleString() ?? 0} chars` },
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

// ── Reference table ───────────────────────────────────────────
function AsciiReferenceTable() {
  const [showFull, setShowFull] = useState(false);

  const commonChars = [
    { char: "A",  dec: 65,  hex: "41", oct: "101", bin: "01000001" },
    { char: "Z",  dec: 90,  hex: "5A", oct: "132", bin: "01011010" },
    { char: "a",  dec: 97,  hex: "61", oct: "141", bin: "01100001" },
    { char: "z",  dec: 122, hex: "7A", oct: "172", bin: "01111010" },
    { char: "0",  dec: 48,  hex: "30", oct: "60",  bin: "00110000" },
    { char: "9",  dec: 57,  hex: "39", oct: "71",  bin: "00111001" },
    { char: " ",  dec: 32,  hex: "20", oct: "40",  bin: "00100000" },
    { char: "!",  dec: 33,  hex: "21", oct: "41",  bin: "00100001" },
    { char: ".",  dec: 46,  hex: "2E", oct: "56",  bin: "00101110" },
    { char: "@",  dec: 64,  hex: "40", oct: "100", bin: "01000000" },
    { char: "#",  dec: 35,  hex: "23", oct: "43",  bin: "00100011" },
    { char: "\n", dec: 10,  hex: "0A", oct: "12",  bin: "00001010" },
  ];

  const allChars = Array.from({ length: 94 }, (_, i) => {
    const code = i + 32;
    return {
      char: code === 32 ? "SP" : String.fromCharCode(code),
      dec:  code,
      hex:  code.toString(16).toUpperCase().padStart(2, "0"),
      oct:  code.toString(8),
      bin:  code.toString(2).padStart(8, "0"),
    };
  });

  const displayData = showFull ? allChars : commonChars;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          ASCII Reference Table
        </span>
        <button
          onClick={() => setShowFull((v) => !v)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
        >
          {showFull ? "Show common" : "Show all printable"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Char", "Dec", "Hex", "Oct", "Binary"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayData.map((row, i) => (
              <tr key={i} className="hover:bg-blue-50 transition-colors cursor-default">
                <td className="px-4 py-2 font-mono font-bold text-blue-700">
                  {row.char === "\n" ? "\\n" : row.char}
                </td>
                <td className="px-4 py-2 font-mono text-gray-700">{row.dec}</td>
                <td className="px-4 py-2 font-mono text-purple-600">{row.hex}</td>
                <td className="px-4 py-2 font-mono text-amber-600">{row.oct}</td>
                <td className="px-4 py-2 font-mono text-green-600 text-xs">{row.bin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Empty output state — SVG instead of emoji ─────────────────
function EmptyOutput({ message }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center opacity-40">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </div>
      <p className="text-xs text-gray-300">{message}</p>
    </div>
  );
}

// ============================================================
// TEXT → ASCII SECTION
// ============================================================

function TextToAsciiSection() {
  const [input,     setInput]     = useState("");
  const [output,    setOutput]    = useState("");
  const [error,     setError]     = useState(null);
  const [stats,     setStats]     = useState(null);
  const [format,    setFormat]    = useState("decimal");
  const [separator, setSeparator] = useState(" ");
  const [autoConv,  setAutoConv]  = useState(true);

  const handleConvert = useCallback(() => {
    if (!input) {
      setError("Please enter text to convert.");
      setOutput("");
      setStats(null);
      return;
    }
    const result = textToAscii(input, { format, separator });
    if (result.success) {
      setOutput(result.output);
      setError(null);
      setStats(result.stats);
    } else {
      setOutput("");
      setError(result.error);
      setStats(null);
    }
  }, [input, format, separator]);

  useEffect(() => {
    if (!autoConv || !input) return;
    const t = setTimeout(handleConvert, 300);
    return () => clearTimeout(t);
  }, [input, format, separator, autoConv, handleConvert]);

  useEffect(() => {
    if (input && output) handleConvert();
  }, [format, separator]);

  function handleClear() {
    setInput(""); setOutput(""); setError(null); setStats(null);
  }

  const inputMeta  = input  ? `${input.length} chars` : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars` : null;

  return (
    <div className="space-y-3">
      <SectionHeading
        icon={
          /* ← was: "🔢" emoji */
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        }
        title="Text → ASCII Codes"
        subtitle="Convert readable text into ASCII decimal, hex, octal or binary values"
      />

      {/* ── Options bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
        <FormatSelector value={format} onChange={setFormat} />

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Separator:</span>
          <select
            value={separator}
            onChange={(e) => setSeparator(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-gray-700 cursor-pointer transition-colors"
          >
            {SEPARATOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <Toggle checked={autoConv} onChange={setAutoConv} label="Auto convert" />

        <button
          onClick={handleConvert}
          data-primary="true"
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Convert
        </button>

        {(input || output) && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Two-panel ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="flex flex-col">
          <PanelHeader
            label="Text Input"
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
            onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
            placeholder="Type or paste text here..."
            spellCheck={false}
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[160px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
          />
        </div>

        <div className="flex flex-col">
          <PanelHeader
            label={`${FORMAT_OPTIONS.find((f) => f.value === format)?.label ?? "ASCII"} Output`}
            meta={outputMeta}
            actions={<CopyButton text={output} />}
          />
          <div className="relative flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[160px]">
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              className="w-full h-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[160px] text-gray-800 cursor-default select-all"
            />
            {!output && !error && <EmptyOutput message="ASCII codes appear here" />}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      <StatsBar stats={stats} />
    </div>
  );
}

// ============================================================
// ASCII → TEXT SECTION
// ============================================================

function AsciiToTextSection() {
  const [input,    setInput]    = useState("");
  const [output,   setOutput]   = useState("");
  const [error,    setError]    = useState(null);
  const [stats,    setStats]    = useState(null);
  const [format,   setFormat]   = useState("auto");
  const [autoConv, setAutoConv] = useState(true);

  const handleConvert = useCallback(() => {
    if (!input.trim()) {
      setError("Please enter ASCII codes to convert.");
      setOutput("");
      setStats(null);
      return;
    }
    const result = asciiToText(input, { format });
    if (result.success) {
      setOutput(result.output);
      setError(null);
      setStats(result.stats);
    } else {
      setOutput("");
      setError(result.error);
      setStats(null);
    }
  }, [input, format]);

  useEffect(() => {
    if (!autoConv || !input.trim()) return;
    const t = setTimeout(handleConvert, 300);
    return () => clearTimeout(t);
  }, [input, format, autoConv, handleConvert]);

  useEffect(() => {
    if (input.trim() && output) handleConvert();
  }, [format]);

  function handleClear() {
    setInput(""); setOutput(""); setError(null); setStats(null);
  }

  const inputMeta = input
    ? `${input.trim().split(/[\s,]+/).filter(Boolean).length} codes`
    : null;

  return (
    <div className="space-y-3">
      <SectionHeading
        icon={
          /* ← was: "📝" emoji */
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        title="ASCII Codes → Text"
        subtitle="Convert decimal, hex, octal or binary ASCII codes back to readable text"
      />

      {/* ── Options bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Input format:</span>
          <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
            {[
              { value: "auto",    label: "Auto"    },
              { value: "decimal", label: "Decimal" },
              { value: "hex",     label: "Hex"     },
              { value: "octal",   label: "Octal"   },
              { value: "binary",  label: "Binary"  },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  format === opt.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Toggle checked={autoConv} onChange={setAutoConv} label="Auto convert" />

        <button
          onClick={handleConvert}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Convert
        </button>

        {(input || output) && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Two-panel ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="flex flex-col">
          <PanelHeader
            label="ASCII Code Input"
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
            onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
            placeholder={`Paste ASCII codes here...\n\nExamples:\n• Decimal: 72 101 108 108 111\n• Hex:     48 65 6C 6C 6F\n• Octal:   110 145 154 154 157\n• Binary:  01001000 01100101...`}
            spellCheck={false}
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[160px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        <div className="flex flex-col">
          <PanelHeader
            label="Text Output"
            meta={output ? `${output.length} chars` : null}
            actions={<CopyButton text={output} />}
          />
          <div className="relative flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[160px]">
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              className="w-full h-full px-4 py-3.5 text-sm font-sans leading-relaxed bg-gray-50 outline-none resize-none min-h-[160px] text-gray-800 cursor-default select-all"
            />
            {!output && !error && <EmptyOutput message="Decoded text appears here" />}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />

      {stats && (
        <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
          {[
            { label: "Codes decoded", value: stats.charCount?.toLocaleString()    ?? 0 },
            { label: "Output chars",  value: stats.outputLength?.toLocaleString() ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400">{label}:</span>
              <span className="font-mono font-semibold text-gray-700">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AsciiConverter() {
  const [showReference, setShowReference] = useState(false);

  return (
    <div className="space-y-6">

      {/* ── Text → ASCII ─────────────────────────────────────── */}
      <TextToAsciiSection />

      {/* ── Divider ──────────────────────────────────────────── */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-white text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Reverse conversion
          </span>
        </div>
      </div>

      {/* ── ASCII → Text ─────────────────────────────────────── */}
      <AsciiToTextSection />

      {/* ── Reference table toggle ───────────────────────────── */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={() => setShowReference((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 rounded-xl cursor-pointer transition-all w-full justify-center"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
          </svg>
          {showReference ? "Hide" : "Show"} ASCII Reference Table
          <svg
            width="14"
            height="14"
            className={`transition-transform ${showReference ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showReference && (
          <div className="mt-3">
            <AsciiReferenceTable />
          </div>
        )}
      </div>
    </div>
  );
}