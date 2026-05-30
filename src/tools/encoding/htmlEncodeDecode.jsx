"use client";

import { useState, useCallback, useEffect } from "react";
import { encodeHtml, decodeHtml } from "@/utils/encoders";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// CONSTANTS
// ============================================================

const ENCODE_MODES = [
  { value: "standard", label: "Standard",  desc: "Encodes & < > \" ' ` / ="      },
  { value: "named",    label: "Named only", desc: "Encodes only & < > \" '"       },
  { value: "all",      label: "Encode all", desc: "Encodes all non-ASCII as numeric entities" },
];

const NAMED_ENTITIES = [
  { entity: "&amp;",   char: "&",  name: "Ampersand"         },
  { entity: "&lt;",    char: "<",  name: "Less than"          },
  { entity: "&gt;",    char: ">",  name: "Greater than"       },
  { entity: "&quot;",  char: `"`,  name: "Double quote"       },
  { entity: "&#39;",   char: "'",  name: "Single quote"       },
  { entity: "&nbsp;",  char: " ",  name: "Non-breaking space" },
  { entity: "&copy;",  char: "©",  name: "Copyright"          },
  { entity: "&reg;",   char: "®",  name: "Registered"         },
  { entity: "&trade;", char: "™",  name: "Trademark"          },
  { entity: "&mdash;", char: "—",  name: "Em dash"            },
  { entity: "&ndash;", char: "–",  name: "En dash"            },
  { entity: "&euro;",  char: "€",  name: "Euro sign"          },
  { entity: "&pound;", char: "£",  name: "Pound sign"         },
  { entity: "&yen;",   char: "¥",  name: "Yen sign"           },
  { entity: "&laquo;", char: "«",  name: "Left guillemet"     },
  { entity: "&raquo;", char: "»",  name: "Right guillemet"    },
  { entity: "&hellip;",char: "…",  name: "Ellipsis"           },
  { entity: "&hearts;",char: "♥",  name: "Heart"              },
  { entity: "&star;",  char: "★",  name: "Star"               },
  { entity: "&check;", char: "✓",  name: "Checkmark"          },
];

// ============================================================
// HELPERS
// ============================================================

function countEntities(str)     { return (str.match(/&[#\w]+;/g) || []).length; }
function countSpecialChars(str) { return (str.match(/[&<>"'`=/]/g) || []).length; }

function getDiffStats(original, result) {
  const origLen   = original.length;
  const resultLen = result.length;
  const diff      = resultLen - origLen;
  return { original: origLen, result: resultLen, diff, larger: diff > 0, pct: origLen > 0 ? Math.abs(Math.round((diff / origLen) * 100)) : 0 };
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Mode tabs — SVG lock/unlock icons instead of 🔒/🔓 emojis
function ModeTabs({ mode, onChange }) {
  const tabs = [
    { value: "encode", label: "Encode", desc: "HTML → Entities" },
    { value: "decode", label: "Decode", desc: "Entities → HTML" },
  ];
  const icons = {
    encode: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    decode: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
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
          <span className={`text-xs font-normal hidden sm:inline ${mode === tab.value ? "text-blue-400" : "text-gray-400"}`}>{tab.desc}</span>
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

function StatsBar({ input, output, mode }) {
  if (!output) return null;
  const diffStats = getDiffStats(input, output);
  const items = mode === "encode"
    ? [
        { label: "Input chars",   value: input.length.toLocaleString()            },
        { label: "Special chars", value: countSpecialChars(input).toLocaleString()},
        { label: "Output chars",  value: output.length.toLocaleString()           },
        { label: "Size change",   value: diffStats.diff === 0 ? "No change" : `+${diffStats.pct}% larger`, highlight: diffStats.diff > 0 },
      ]
    : [
        { label: "Entities found", value: countEntities(input).toLocaleString()  },
        { label: "Input chars",    value: input.length.toLocaleString()           },
        { label: "Output chars",   value: output.length.toLocaleString()          },
        { label: "Size change",    value: diffStats.diff === 0 ? "No change" : `-${diffStats.pct}% smaller`, highlight: false },
      ];
  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {items.map(({ label, value, highlight }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className={`font-mono font-semibold ${highlight ? "text-amber-600" : "text-gray-700"}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function EncodeModeSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Mode:</span>
      <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
        {ENCODE_MODES.map((opt) => (
          <button key={opt.value} onClick={() => onChange(opt.value)} title={opt.desc}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              value === opt.value ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HtmlPreview({ html }) {
  if (!html) return null;
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rendered Preview</span>
        <span className="text-xs text-gray-400">How decoded HTML looks in browser</span>
      </div>
      <div className="p-4 bg-white text-sm text-gray-800 leading-relaxed max-h-[200px] overflow-auto prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function EntityHighlighter({ text }) {
  if (!text) return null;
  const entities = text.match(/&[#\w]+;/g) || [];
  if (entities.length === 0) return null;
  const unique = [...new Set(entities)];
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detected Entities ({entities.length})</span>
        <span className="text-xs text-gray-400">{unique.length} unique</span>
      </div>
      <div className="p-3 bg-white">
        <div className="flex flex-wrap gap-1.5">
          {unique.slice(0, 40).map((entity) => {
            const count = entities.filter((e) => e === entity).length;
            return (
              <div key={entity} title={`Appears ${count} time${count !== 1 ? "s" : ""}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded-lg cursor-default hover:bg-orange-100 transition-colors">
                <span className="text-xs font-mono font-bold text-orange-700">{entity}</span>
                {count > 1 && <span className="text-xs font-semibold text-orange-500 bg-orange-100 px-1 rounded">×{count}</span>}
              </div>
            );
          })}
          {unique.length > 40 && <span className="text-xs text-gray-400 self-center">+{unique.length - 40} more</span>}
        </div>
      </div>
    </div>
  );
}

function EntityReferenceTable({ onInsert }) {
  const [search, setSearch] = useState("");
  const filtered = NAMED_ENTITIES.filter((e) =>
    e.entity.toLowerCase().includes(search.toLowerCase()) ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.char.includes(search)
  );
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">HTML Entity Reference</span>
        <div className="relative">
          <svg width="12" height="12" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entities..."
            className="pl-7 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 w-40 cursor-text transition-colors" />
        </div>
      </div>
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0">
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Char", "Entity", "Name", "Action"].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((row) => (
              <tr key={row.entity} className="hover:bg-orange-50 transition-colors cursor-default">
                <td className="px-4 py-2 font-bold text-base text-gray-800">{row.char}</td>
                <td className="px-4 py-2 font-mono text-orange-700">{row.entity}</td>
                <td className="px-4 py-2 text-gray-500">{row.name}</td>
                <td className="px-4 py-2">
                  {onInsert && (
                    <button onClick={() => onInsert(row.entity)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded cursor-pointer transition-colors">
                      Insert
                    </button>
                  )}
                  <button onClick={() => copyToClipboard(row.entity)}
                    className="text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer transition-colors ml-1">
                    Copy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Empty output — lock/unlock SVG instead of 🔒/🔓 emojis ───
function EmptyOutput({ mode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center opacity-40">
        {mode === "encode" ? (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <p className="text-xs text-gray-300">
        {mode === "encode" ? "Encoded HTML entities appear here" : "Decoded HTML appears here"}
      </p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function HtmlEncodeTool() {
  const [mode,        setMode]        = useState("encode");
  const [input,       setInput]       = useState("");
  const [output,      setOutput]      = useState("");
  const [error,       setError]       = useState(null);
  const [encodeMode,  setEncodeMode]  = useState("standard");
  const [autoConvert, setAutoConvert] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showRef,     setShowRef]     = useState(false);

  const handleProcess = useCallback(() => {
    const raw = typeof input === "string" ? input : "";
    if (!raw.trim()) {
      setError(mode === "encode" ? "Please enter HTML to encode." : "Please enter HTML entities to decode.");
      setOutput(""); return;
    }
    if (mode === "encode") {
      const result = encodeHtml(raw, { encodeAll: encodeMode === "all", namedOnly: encodeMode === "named" });
      if (result.success) { setOutput(result.output); setError(null); }
      else { setOutput(""); setError(result.error); }
    } else {
      const result = decodeHtml(raw);
      if (result.success) { setOutput(result.output); setError(null); }
      else { setOutput(""); setError(result.error); }
    }
  }, [input, mode, encodeMode]);

  useEffect(() => {
    if (!autoConvert || !input.trim()) return;
    const t = setTimeout(handleProcess, 300);
    return () => clearTimeout(t);
  }, [input, autoConvert, handleProcess]);

  useEffect(() => {
    if (input.trim() && output) handleProcess();
  }, [encodeMode]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleProcess();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleProcess]);

  function handleModeChange(newMode) { setMode(newMode); setInput(""); setOutput(""); setError(null); }
  function handleSwap() {
    if (!output) return;
    setMode(mode === "encode" ? "decode" : "encode");
    setInput(output); setOutput(""); setError(null);
  }
  function handleClear() { setInput(""); setOutput(""); setError(null); }
  function handleInsertEntity(entity) { setInput((prev) => prev + entity); }

  const inputMeta  = input  ? mode === "encode" ? `${input.length.toLocaleString()} chars · ${countSpecialChars(input)} special` : `${input.length.toLocaleString()} chars · ${countEntities(input)} entities` : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars` : null;

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
          {mode === "encode" ? "Encode HTML" : "Decode Entities"}
        </button>

        {mode === "encode" && <EncodeModeSelector value={encodeMode} onChange={setEncodeMode} />}
        <Toggle checked={autoConvert} onChange={setAutoConvert} label="Auto convert" description="Convert automatically as you type" />
        {mode === "decode" && output && <Toggle checked={showPreview} onChange={setShowPreview} label="Show preview" description="Render decoded HTML in browser" />}

        {output && (
          <button onClick={handleSwap}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg transition-all cursor-pointer">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Swap &amp; {mode === "encode" ? "decode" : "encode"}
          </button>
        )}

        {(input || output) && (
          <button onClick={handleClear}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer transition-colors">
            Clear
          </button>
        )}

        <button onClick={() => setShowRef((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-all cursor-pointer ${
            showRef ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-white border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
          </svg>
          Entity table
        </button>

        <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
        </div>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <PanelHeader label={mode === "encode" ? "HTML Input" : "Entities Input"} meta={inputMeta}
            actions={input && <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
          />
          <textarea value={input} onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
            placeholder={mode === "encode"
              ? `Paste HTML to encode...\n\n<div class="box">\n  Hello & "World"\n  <script>alert('xss')</script>\n</div>`
              : `Paste HTML entities to decode...\n\n&lt;div&gt;\n  Hello &amp; &quot;World&quot;\n  Copyright &copy; 2024\n&lt;/div&gt;`}
            spellCheck={false} autoCorrect="off" autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[300px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        <div className="flex flex-col">
          <PanelHeader label={mode === "encode" ? "Encoded Output" : "Decoded HTML"} meta={outputMeta}
            actions={<>
              {output && <CopyButton text={output} />}
              {output && (
                <button onClick={() => downloadText(output, mode === "encode" ? "encoded.html" : "decoded.html", "text/html")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
              )}
            </>}
          />
          <div className="relative flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[300px]">
            <textarea value={output} readOnly spellCheck={false}
              className="w-full h-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[300px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
            />
            {!output && !error && <EmptyOutput mode={mode} />}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      <StatsBar input={input} output={output} mode={mode} />
      {mode === "decode" && input && countEntities(input) > 0 && <EntityHighlighter text={input} />}
      {mode === "decode" && showPreview && output && <HtmlPreview html={output} />}
      {showRef && <EntityReferenceTable onInsert={mode === "decode" ? handleInsertEntity : null} />}
    </div>
  );
}