"use client";

import { useState, useCallback, useEffect } from "react";
import { encodeUrl, decodeUrl, parseUrl } from "@/utils/encoders";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// CONSTANTS
// ============================================================

const SAMPLES = {
  component: "Hello World! & special=chars?foo=bar#section",
  full:      "https://example.com/search?q=hello world&lang=en&page=1&filter=a>b",
  form:      "name=John Doe&email=john@example.com&message=Hello & Goodbye!",
  parse:     "https://api.example.com/v1/users?page=1&limit=10&sort=desc&filter=active#results",
};

const MODE_OPTIONS = [
  {
    value: "encode",
    label: "Encode",
    icon:  "🔒",
    desc:  "Text → URL encoded",
  },
  {
    value: "decode",
    label: "Decode",
    icon:  "🔓",
    desc:  "URL encoded → Text",
  },
  {
    value: "parse",
    label: "Parse URL",
    icon:  "🔍",
    desc:  "Break URL into parts",
  },
];

const ENCODE_MODE_OPTIONS = [
  {
    value: "component",
    label: "Component",
    desc:  "encodeURIComponent — encodes all special chars",
    example: "hello%20world%21",
  },
  {
    value: "full",
    label: "Full URL",
    desc:  "encodeURI — preserves URL structure chars",
    example: "https://example.com/path?q=hello%20world",
  },
  {
    value: "form",
    label: "Form data",
    desc:  "application/x-www-form-urlencoded — spaces as +",
    example: "hello+world%21",
  },
];

// ============================================================
// HELPERS
// ============================================================

function countEncodedChars(str) {
  return (str.match(/%[0-9A-Fa-f]{2}/g) || []).length;
}

function countDecodableChars(str) {
  return (str.match(/%[0-9A-Fa-f]{2}|\+/g) || []).length;
}

function getQueryParams(parsed) {
  if (!parsed?.query) return [];
  try {
    const params = new URLSearchParams(parsed.query);
    const result = [];
    params.forEach((value, key) => {
      result.push({ key, value });
    });
    return result;
  } catch {
    return [];
  }
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Mode tabs ─────────────────────────────────────────────────
function ModeTabs({ mode, onChange }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
      {MODE_OPTIONS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
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
function StatsBar({ stats, mode, input, output }) {
  if (!stats || !output) return null;

  const items =
    mode === "encode"
      ? [
          { label: "Input",    value: `${input.length.toLocaleString()} chars`          },
          { label: "Output",   value: `${output.length.toLocaleString()} chars`         },
          { label: "Encoded",  value: `${countEncodedChars(output)} sequences`          },
          { label: "Size",     value: `+${Math.round(((output.length - input.length) / input.length) * 100)}%` },
        ]
      : [
          { label: "Input",    value: `${input.length.toLocaleString()} chars`          },
          { label: "Decoded",  value: `${countDecodableChars(input)} sequences`         },
          { label: "Output",   value: `${output.length.toLocaleString()} chars`         },
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

// ── Encode mode selector ──────────────────────────────────────
function EncodeModeSelector({ value, onChange }) {
  const current = ENCODE_MODE_OPTIONS.find((o) => o.value === value);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
          Mode:
        </span>
        <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
          {ENCODE_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              title={opt.desc}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
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

      {/* Example badge */}
      {current && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs">
          <span className="font-medium text-blue-600">{current.label}:</span>
          <code className="font-mono text-blue-700">{current.example}</code>
          <span className="text-gray-400 hidden sm:inline">— {current.desc}</span>
        </div>
      )}
    </div>
  );
}

// ── Encoded sequence highlighter ──────────────────────────────
function SequenceHighlighter({ text, mode }) {
  if (!text || mode === "parse") return null;

  const sequences =
    mode === "encode"
      ? [...new Set(text.match(/%[0-9A-Fa-f]{2}/g) || [])]
      : [...new Set((text.match(/%[0-9A-Fa-f]{2}|\+/g) || []))];

  if (sequences.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {mode === "encode" ? "Encoded Sequences" : "Decodable Sequences"}
        </span>
        <span className="text-xs text-gray-400">
          {sequences.length} unique
        </span>
      </div>
      <div className="p-3 bg-white">
        <div className="flex flex-wrap gap-1.5">
          {sequences.slice(0, 50).map((seq) => {
            let decoded = seq;
            try {
              decoded =
                seq === "+"
                  ? "Space"
                  : decodeURIComponent(seq);
            } catch {}

            return (
              <div
                key={seq}
                title={`Decodes to: ${decoded}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-50 border border-teal-200 rounded-lg cursor-default hover:bg-teal-100 transition-colors"
              >
                <span className="text-xs font-mono font-bold text-teal-700">
                  {seq}
                </span>
                <span className="text-xs text-teal-500">→</span>
                <span className="text-xs font-semibold text-teal-800">
                  {decoded}
                </span>
              </div>
            );
          })}
          {sequences.length > 50 && (
            <span className="text-xs text-gray-400 self-center">
              +{sequences.length - 50} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── URL parser result ─────────────────────────────────────────
function UrlParserResult({ parsed, raw }) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!parsed) return null;

  async function handleCopyPart(key, value) {
    if (!value) return;
    await copyToClipboard(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const parts = [
    { key: "protocol", label: "Protocol",  value: parsed.protocol, color: "text-blue-600 bg-blue-50 border-blue-200"    },
    { key: "hostname", label: "Hostname",  value: parsed.hostname, color: "text-green-600 bg-green-50 border-green-200"  },
    { key: "port",     label: "Port",      value: parsed.port,     color: "text-orange-600 bg-orange-50 border-orange-200"},
    { key: "pathname", label: "Path",      value: parsed.pathname, color: "text-purple-600 bg-purple-50 border-purple-200"},
    { key: "search",   label: "Query",     value: parsed.search,   color: "text-indigo-600 bg-indigo-50 border-indigo-200"},
    { key: "hash",     label: "Fragment",  value: parsed.hash,     color: "text-pink-600 bg-pink-50 border-pink-200"     },
  ].filter((p) => p.value);

  const queryParams = getQueryParams(parsed);

  return (
    <div className="space-y-3">

      {/* URL breakdown */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            URL Breakdown
          </span>
        </div>

        {/* Visual URL with color coded parts */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
          <p className="text-xs font-mono text-gray-800 break-all leading-relaxed whitespace-pre-wrap">
            {parsed.protocol && (
              <span className="text-blue-600 font-bold">{parsed.protocol}//</span>
            )}
            {parsed.hostname && (
              <span className="text-green-600 font-bold">{parsed.hostname}</span>
            )}
            {parsed.port && (
              <span className="text-orange-600 font-bold">:{parsed.port}</span>
            )}
            {parsed.pathname && (
              <span className="text-purple-600 font-bold">{parsed.pathname}</span>
            )}
            {parsed.search && (
              <span className="text-indigo-600 font-bold">{parsed.search}</span>
            )}
            {parsed.hash && (
              <span className="text-pink-600 font-bold">{parsed.hash}</span>
            )}
          </p>
        </div>

        {/* Parts table */}
        <div className="divide-y divide-gray-50">
          {parts.map(({ key, label, value, color }) => (
            <div
              key={key}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-default"
            >
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md border w-20 flex-shrink-0 text-center ${color}`}>
                {label}
              </span>
              <code className="text-xs font-mono text-gray-700 flex-1 break-all">
                {value}
              </code>
              <button
                onClick={() => handleCopyPart(key, value)}
                className="flex-shrink-0 text-xs font-medium text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg cursor-pointer transition-colors"
              >
                {copiedKey === key ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  "Copy"
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Query parameters table */}
      {queryParams.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Query Parameters
            </span>
            <span className="text-xs text-gray-400">
              {queryParams.length} param{queryParams.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2 text-left font-bold text-gray-500 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-gray-500 uppercase tracking-wider w-16">
                    Copy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {queryParams.map(({ key, value }, i) => (
                  <tr
                    key={i}
                    className="hover:bg-indigo-50 transition-colors cursor-default"
                  >
                    <td className="px-4 py-2 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {key}
                    </td>
                    <td className="px-4 py-2 font-mono text-gray-700 break-all">
                      {value || <span className="text-gray-400 italic">empty</span>}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleCopyPart(`param-${i}`, value)}
                        className="text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                      >
                        {copiedKey === `param-${i}` ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          "Copy"
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Empty output ──────────────────────────────────────────────
function EmptyOutput({ mode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <span className="text-3xl opacity-20">
        {mode === "encode" ? "🔒" : mode === "decode" ? "🔓" : "🔍"}
      </span>
      <p className="text-xs text-gray-300">
        {mode === "encode"
          ? "URL encoded output appears here"
          : mode === "decode"
          ? "Decoded URL appears here"
          : "Parsed URL parts appear here"}
      </p>
    </div>
  );
}

// ── Char encode reference ─────────────────────────────────────
function EncodeReference() {
  const chars = [
    { char: " ", enc: "%20", form: "+",    note: "Space"          },
    { char: "!",enc: "%21", form: "%21",   note: "Exclamation"    },
    { char: "#", enc: "#",  form: "%23",   note: "Hash"           },
    { char: "$", enc: "$",  form: "%24",   note: "Dollar"         },
    { char: "&", enc: "%26", form: "%26",  note: "Ampersand"      },
    { char: "+", enc: "%2B", form: "%2B",  note: "Plus"           },
    { char: ",", enc: "%2C", form: "%2C",  note: "Comma"          },
    { char: "/", enc: "%2F", form: "%2F",  note: "Slash"          },
    { char: ":", enc: "%3A", form: "%3A",  note: "Colon"          },
    { char: ";", enc: "%3B", form: "%3B",  note: "Semicolon"      },
    { char: "=", enc: "%3D", form: "%3D",  note: "Equals"         },
    { char: "?", enc: "%3F", form: "%3F",  note: "Question mark"  },
    { char: "@", enc: "%40", form: "%40",  note: "At sign"        },
    { char: "[", enc: "%5B", form: "%5B",  note: "Open bracket"   },
    { char: "]", enc: "%5D", form: "%5D",  note: "Close bracket"  },
  ];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          URL Encoding Reference
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Char", "Encoded (%XX)", "Form data", "Name"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {chars.map((row) => (
              <tr
                key={row.char}
                className="hover:bg-teal-50 transition-colors cursor-default"
              >
                <td className="px-4 py-2 font-mono font-bold text-teal-700">
                  {row.char}
                </td>
                <td className="px-4 py-2 font-mono text-blue-600">
                  {row.enc}
                </td>
                <td className="px-4 py-2 font-mono text-green-600">
                  {row.form}
                </td>
                <td className="px-4 py-2 text-gray-500">{row.note}</td>
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

export default function UrlTool() {
  const [mode,        setMode]        = useState("encode");
  const [input,       setInput]       = useState("");
  const [output,      setOutput]      = useState("");
  const [error,       setError]       = useState(null);
  const [stats,       setStats]       = useState(null);
  const [parsed,      setParsed]      = useState(null);
  const [encodeMode,  setEncodeMode]  = useState("component");
  const [autoConvert, setAutoConvert] = useState(true);
  const [showRef,     setShowRef]     = useState(false);

  // ── Process handler ─────────────────────────────────────────
  const handleProcess = useCallback(() => {
    const trimmed = input.trim();

    if (!trimmed) {
      setError(
        mode === "encode"
          ? "Please enter text to encode."
          : mode === "decode"
          ? "Please enter a URL-encoded string to decode."
          : "Please enter a URL to parse."
      );
      setOutput("");
      setParsed(null);
      setStats(null);
      return;
    }

    if (mode === "encode") {
      const result = encodeUrl(trimmed, { mode: encodeMode });
      if (result.success) {
        setOutput(result.output);
        setError(null);
        setStats(result.stats);
        setParsed(null);
      } else {
        setOutput("");
        setError(result.error);
        setStats(null);
      }
    } else if (mode === "decode") {
      const result = decodeUrl(trimmed, { mode: encodeMode });
      if (result.success) {
        setOutput(result.output);
        setError(null);
        setStats(result.stats);
        setParsed(null);
      } else {
        setOutput("");
        setError(result.error);
        setStats(null);
      }
    } else {
      // Parse mode
      const result = parseUrl(trimmed);
      if (result.success) {
        setOutput("");
        setParsed(result.parsed);
        setError(null);
        setStats(result.stats);
      } else {
        setOutput("");
        setParsed(null);
        setError(result.error);
        setStats(null);
      }
    }
  }, [input, mode, encodeMode]);

  // ── Auto convert ────────────────────────────────────────────
  useEffect(() => {
    if (!autoConvert || !input.trim()) return;
    const t = setTimeout(handleProcess, 300);
    return () => clearTimeout(t);
  }, [input, autoConvert, handleProcess]);

  // ── Re-run when options change ───────────────────────────────
  useEffect(() => {
    if (input.trim() && (output || parsed)) handleProcess();
  }, [encodeMode]);

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
    setParsed(null);
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
    setParsed(null);
  }

  // ── Clear ────────────────────────────────────────────────────
  function handleClear() {
    setInput("");
    setOutput("");
    setError(null);
    setStats(null);
    setParsed(null);
  }

  // ── Sample ───────────────────────────────────────────────────
  function handleSample() {
    const map = {
      encode: SAMPLES.component,
      decode: encodeMode === "form"
        ? SAMPLES.form.split("").map((c) =>
            c === " " ? "+" : encodeURIComponent(c) === c ? c : encodeURIComponent(c)
          ).join("")
        : encodeURIComponent(SAMPLES.component),
      parse:  SAMPLES.parse,
    };
    setInput(map[mode] || SAMPLES.component);
    setOutput("");
    setParsed(null);
    setError(null);
    setStats(null);
  }

  // ── Derived ──────────────────────────────────────────────────
  const inputMeta = input
    ? mode === "encode"
      ? `${input.length.toLocaleString()} chars`
      : mode === "decode"
      ? `${countDecodableChars(input)} sequences`
      : `${input.length.toLocaleString()} chars`
    : null;

  const outputMeta = output
    ? `${output.length.toLocaleString()} chars`
    : null;

  return (
    <div className="space-y-5">

      {/* ── Mode selector ────────────────────────────────────── */}
      <ModeTabs mode={mode} onChange={handleModeChange} />

      {/* ── Encode mode selector ─────────────────────────────── */}
      {mode !== "parse" && (
        <EncodeModeSelector
          value={encodeMode}
          onChange={setEncodeMode}
        />
      )}

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
          {mode === "encode"
            ? "Encode URL"
            : mode === "decode"
            ? "Decode URL"
            : "Parse URL"}
        </button>

        {/* Auto convert */}
        <Toggle
          checked={autoConvert}
          onChange={setAutoConvert}
          label="Auto convert"
          description="Convert automatically as you type"
        />

        {/* Swap */}
        {output && mode !== "parse" && (
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

        {/* Reference toggle */}
        <button
          onClick={() => setShowRef((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-all cursor-pointer ${
            showRef
              ? "bg-teal-50 border-teal-200 text-teal-700"
              : "bg-white border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
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
              d="M3 10h18M3 14h18M10 3v18M14 3v18"
            />
          </svg>
          Reference
        </button>

        {/* Sample */}
        <button
          onClick={handleSample}
          className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 cursor-pointer transition-colors"
        >
          Sample
        </button>

        {/* Clear */}
        {(input || output || parsed) && (
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

      {/* ── Two-panel layout (encode / decode) ───────────────── */}
      {mode !== "parse" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Input */}
          <div className="flex flex-col">
            <PanelHeader
              label={mode === "encode" ? "Text Input" : "Encoded URL Input"}
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
                  ? "Type or paste text to encode...\n\nExamples:\n• Hello World! & special=chars\n• https://example.com/path?q=hello world\n• name=John Doe&email=john@example.com"
                  : "Paste URL-encoded string to decode...\n\nExamples:\n• Hello%20World%21%20%26%20special%3Dchars\n• https://example.com?q=hello%20world\n• name=John+Doe&email=john%40example.com"
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
              label={mode === "encode" ? "Encoded Output" : "Decoded Output"}
              meta={outputMeta}
              actions={
                <>
                  {output && <CopyButton text={output} />}
                  {output && (
                    <button
                      onClick={() =>
                        downloadText(
                          output,
                          mode === "encode" ? "encoded.txt" : "decoded.txt",
                          "text/plain"
                        )
                      }
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
      )}

      {/* ── Parse mode layout ─────────────────────────────────── */}
      {mode === "parse" && (
        <div className="space-y-4">
          {/* URL input */}
          <div className="flex flex-col">
            <PanelHeader
              label="URL Input"
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
              placeholder="Paste a full URL to parse...\n\nhttps://api.example.com/v1/users?page=1&limit=10&sort=desc#results\n\nExtracts: protocol, hostname, port, path, query params, fragment"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              rows={3}
              className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
            />
          </div>

          {/* Parse results */}
          {parsed && (
            <UrlParserResult parsed={parsed} raw={input} />
          )}

          {/* Parse empty state */}
          {!parsed && !error && (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-4">
              <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                🔍
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-500">
                  Paste a URL to parse
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Breaks URL into protocol, hostname, path, query params and fragment
                </p>
              </div>
              <button
                onClick={handleSample}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer"
              >
                Load sample URL
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────── */}
      <ErrorBanner message={error} />

      {/* ── Stats ────────────────────────────────────────────── */}
      {mode !== "parse" && (
        <StatsBar
          stats={stats}
          mode={mode}
          input={input}
          output={output}
        />
      )}

      {/* ── Sequence highlighter ─────────────────────────────── */}
      {mode !== "parse" && output && (
        <SequenceHighlighter
          text={mode === "encode" ? output : input}
          mode={mode}
        />
      )}

      {/* ── Reference table ──────────────────────────────────── */}
      {showRef && <EncodeReference />}

    </div>
  );
}