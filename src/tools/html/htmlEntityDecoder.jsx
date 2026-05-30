"use client";
import { useState, useCallback } from "react";

// ── Decoding logic ─────────────────────────────────────────────
function decodeHtmlEntities(text) {
  if (typeof window === "undefined") return text;
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

// Named entities for reference panel
const ENTITY_EXAMPLES = [
  { entity: "&amp;",   char: "&"  },
  { entity: "&lt;",    char: "<"  },
  { entity: "&gt;",    char: ">"  },
  { entity: "&quot;",  char: '"'  },
  { entity: "&#39;",   char: "'"  },
  { entity: "&copy;",  char: "©"  },
  { entity: "&reg;",   char: "®"  },
  { entity: "&trade;", char: "™"  },
  { entity: "&euro;",  char: "€"  },
  { entity: "&pound;", char: "£"  },
  { entity: "&yen;",   char: "¥"  },
  { entity: "&deg;",   char: "°"  },
  { entity: "&mdash;", char: "—"  },
  { entity: "&ndash;", char: "–"  },
  { entity: "&hellip;",char: "…"  },
  { entity: "&nbsp;",  char: " "  },
  { entity: "&#128;",  char: "€"  },
];

// ── Shared sub-components ──────────────────────────────────────
function CopyButton({ text }) {
  const [state, setState] = useState("idle");

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("error");
    }
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
          Copy
        </>
      )}
    </button>
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

// ── Main component ─────────────────────────────────────────────
export default function HtmlEntityDecoder() {
  const [input,    setInput]    = useState("");
  const [output,   setOutput]   = useState("");
  const [autoMode, setAutoMode] = useState(true);
  const [error,    setError]    = useState(null);

  const decode = useCallback((text) => {
    if (!text.trim()) return "";
    try {
      const result = decodeHtmlEntities(text);
      setError(null);
      return result;
    } catch (e) {
      setError("Failed to decode — input may contain invalid entities.");
      return "";
    }
  }, []);

  function handleInput(val) {
    setInput(val);
    if (autoMode) setOutput(decode(val));
  }

  function handleDecode() {
    setOutput(decode(input));
  }

  function handleClear() {
    setInput("");
    setOutput("");
    setError(null);
  }

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars` : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars` : null;

  const entityCount = input
    ? (input.match(/&[a-zA-Z#0-9]+;/g) || []).length
    : 0;

  const savedChars = output && input ? input.length - output.length : 0;

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleDecode}
          data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Decode
        </button>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none ml-1">
          <button
            role="switch"
            aria-checked={autoMode}
            onClick={() => setAutoMode((v) => !v)}
            className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
              autoMode ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                autoMode ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-xs font-medium text-gray-600">Auto decode</span>
        </label>

        {input && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input */}
        <div className="flex flex-col">
          <PanelHeader label="Encoded HTML Input" meta={inputMeta} />
          <textarea
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={`Paste HTML-encoded text here...\n\nExamples:\n  &lt;div class=&quot;box&quot;&gt;\n  Copyright &copy; 2024 &mdash; All rights reserved&trade;\n  2 &lt; 5 &amp;&amp; 10 &gt; 3\n  &#128512; Emoji via numeric entity`}
            spellCheck={false}
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[280px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader
            label="Decoded Output"
            meta={outputMeta}
            actions={<CopyButton text={output} />}
          />
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[280px] relative">
            {output ? (
              <textarea
                readOnly
                value={output}
                spellCheck={false}
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none text-gray-800 cursor-default select-all"
              />
            ) : (
              /* ── Empty state — unlock SVG instead of 🔓 emoji ── */
              <div className="flex flex-col items-center justify-center w-full gap-2 pointer-events-none">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center opacity-40">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-300">Decoded text appears here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs font-mono text-red-700 leading-relaxed">{error}</p>
        </div>
      )}

      {/* ── Stats bar ────────────────────────────────────────── */}
      {(input || output) && (
        <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
          {[
            { label: "Input",    value: `${input.length.toLocaleString()} chars`  },
            { label: "Output",   value: `${output.length.toLocaleString()} chars` },
            { label: "Entities", value: entityCount.toLocaleString()              },
            { label: "Reduced",  value: savedChars > 0 ? `−${savedChars.toLocaleString()} chars` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400">{label}:</span>
              <span className="font-mono font-semibold text-gray-700">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Entity reference ─────────────────────────────────── */}
      <div className="flex flex-col">
        <PanelHeader label="Entity Reference" />
        <div className="p-4 bg-white border border-gray-200 border-t-0 rounded-b-xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {ENTITY_EXAMPLES.map(({ entity, char }) => (
              <div
                key={entity}
                className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg"
              >
                <span className="text-xs font-mono text-blue-600">{entity}</span>
                <svg width="12" height="12" className="text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span className="text-sm font-mono text-gray-700 font-semibold w-5 text-center">
                  {char === " " ? "·" : char}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}