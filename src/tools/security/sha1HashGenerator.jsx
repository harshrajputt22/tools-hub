"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard, downloadText, readFileAsText } from "@/lib/helpers";
import { FileText } from "lucide-react";
import { Zap, CheckCircle, Folder, GitCompare } from "lucide-react";

// ============================================================
// SHA-1 IMPLEMENTATION
// Pure JS — RFC 3174 compliant
// Uses Web Crypto API with fallback to pure JS
// ============================================================

async function sha1(input) {
  try {
    // Prefer Web Crypto API (faster, native)
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(input);
      const hashBuf = await window.crypto.subtle.digest("SHA-1", encoded);
      return Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    // fall through to pure JS
  }

  // Pure JS fallback — RFC 3174
  return sha1PureJS(input);
}

function sha1PureJS(msg) {
  function rotate32(n, b) {
    return (n << b) | (n >>> (32 - b));
  }

  function toHex(n) {
    let s = "";
    for (let i = 7; i >= 0; i--) {
      s += "0123456789abcdef"[(n >> (i * 4)) & 0xf];
    }
    return s;
  }

  // Pre-process message
  const msgBytes = [];
  for (let i = 0; i < msg.length; i++) {
    const code = msg.charCodeAt(i);
    if (code < 128) {
      msgBytes.push(code);
    } else if (code < 2048) {
      msgBytes.push(192 | (code >> 6), 128 | (code & 63));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < msg.length) {
      const next = msg.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        const cp = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        msgBytes.push(
          240 | (cp >> 18),
          128 | ((cp >> 12) & 63),
          128 | ((cp >> 6) & 63),
          128 | (cp & 63)
        );
        i++;
      }
    } else {
      msgBytes.push(224 | (code >> 12), 128 | ((code >> 6) & 63), 128 | (code & 63));
    }
  }

  const bitLen   = msgBytes.length * 8;
  msgBytes.push(0x80);

  while (msgBytes.length % 64 !== 56) msgBytes.push(0);

  for (let i = 7; i >= 0; i--) {
    msgBytes.push((bitLen / Math.pow(2, i * 8)) & 0xff);
  }

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let i = 0; i < msgBytes.length; i += 64) {
    const w = [];
    for (let j = 0; j < 16; j++) {
      w[j] =
        (msgBytes[i + j * 4]     << 24) |
        (msgBytes[i + j * 4 + 1] << 16) |
        (msgBytes[i + j * 4 + 2] << 8)  |
         msgBytes[i + j * 4 + 3];
    }
    for (let j = 16; j < 80; j++) {
      w[j] = rotate32(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4;

    for (let j = 0; j < 80; j++) {
      let f, k;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (rotate32(a, 5) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = rotate32(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}

// ============================================================
// CONSTANTS
// ============================================================

const SAMPLES = [
  { label: "Hello World",   value: "Hello, World!"                                },
  { label: "DevTools",      value: "DevTools"                                      },
  { label: "Lorem ipsum",   value: "Lorem ipsum dolor sit amet"                    },
  { label: "Numbers",       value: "1234567890"                                    },
  { label: "Unicode",       value: "Héllo Wörld 🌍"                               },
];

const KNOWN_HASHES = [
  { input: "",              hash: "da39a3ee5e6b4b0d3255bfef95601890afd80709" },
  { input: "hello",         hash: "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d" },
  { input: "Hello, World!", hash: "0a0a9f2a6772942557ab5355d76af442f8f65e01" },
  { input: "password",      hash: "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8" },
  { input: "sha1",          hash: "415ab40ae9b7cc4e66d6769cb2c08106e8293b48" },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SectionTabs({ active, onChange }) {
  const tabs = [
    { value: "generate", label: "Generate",  icon: Zap },
    { value: "verify",   label: "Verify",    icon: CheckCircle },
    { value: "file",     label: "File Hash", icon: Folder },
    { value: "compare",  label: "Compare",   icon: GitCompare },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl flex-wrap">
      {tabs.map((tab) => {
        const Icon = tab.icon;

        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center min-w-[100px] ${
              active === tab.value
                ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
          </button>
        );
      })}
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

// ── Security warning ──────────────────────────────────────────
function SecurityWarning() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
      <svg
        width="16"
        height="16"
        className="flex-shrink-0 mt-0.5 text-amber-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div>
        <p className="text-xs font-bold text-amber-800">Security Notice</p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          SHA-1 is <strong>deprecated for cryptographic use</strong> since 2011 and is vulnerable to collision attacks. It is <strong>not suitable</strong> for password hashing, digital signatures, or TLS certificates. Use SHA-256 or SHA-3 for security-critical applications. SHA-1 is acceptable for non-security checksums and legacy compatibility only.
        </p>
      </div>
    </div>
  );
}

// ── Hash display card ─────────────────────────────────────────
function HashCard({ hash, uppercase, fileName }) {
  if (!hash) return null;

  const display = uppercase ? hash.toUpperCase() : hash;

  // Split into 5 chunks of 8 chars (SHA-1 = 40 hex chars = 5 × 32-bit words)
  const chunks = display.match(/.{1,8}/g) || [];
  const chunkColors = [
    "bg-blue-50 border-blue-200 text-blue-700",
    "bg-purple-50 border-purple-200 text-purple-700",
    "bg-green-50 border-green-200 text-green-700",
    "bg-orange-50 border-orange-200 text-orange-700",
    "bg-rose-50 border-rose-200 text-rose-700",
  ];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            {fileName ? `SHA-1 of ${fileName}` : "SHA-1 Hash"}
          </span>
          <span className="text-xs text-gray-400">
            160-bit · 40 hex chars
          </span>
        </div>
        <CopyButton text={display} />
      </div>

      {/* Hash value */}
      <div className="px-4 py-4 bg-white space-y-3">
        <code className="block text-sm font-mono font-bold text-gray-900 break-all leading-relaxed tracking-wider">
          {display}
        </code>

        {/* Word segments (5 × 32-bit) */}
        <div className="flex flex-wrap gap-1.5">
          {chunks.map((chunk, i) => (
            <span
              key={i}
              title={`Word ${i + 1}`}
              className={`text-xs font-mono px-2 py-1 rounded-lg border ${chunkColors[i % chunkColors.length]}`}
            >
              {chunk}
            </span>
          ))}
        </div>

        {/* Download */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => downloadText(display, "sha1.txt", "text/plain")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors border border-gray-200 hover:border-green-300"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download hash
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats row ─────────────────────────────────────────────────
function StatsRow({ input, hash, fromFile }) {
  if (!hash) return null;

  const bytes = !fromFile
    ? new TextEncoder().encode(input).length
    : null;

  const items = [
    ...(!fromFile
      ? [
          { label: "Input chars",  value: input.length.toLocaleString()  },
          { label: "Input bytes",  value: bytes?.toLocaleString() ?? "?" },
        ]
      : []),
    { label: "Hash length",   value: "40 chars"           },
    { label: "Hash bits",     value: "160 bits"           },
    { label: "Hash words",    value: "5 × 32-bit"         },
    { label: "Rounds",        value: "80"                 },
    { label: "Algorithm",     value: "SHA-1 (RFC 3174)"   },
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

// ============================================================
// GENERATE SECTION
// ============================================================

function GenerateSection() {
  const [input,     setInput]     = useState("");
  const [hash,      setHash]      = useState("");
  const [error,     setError]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [uppercase, setUppercase] = useState(false);
  const [autoHash,  setAutoHash]  = useState(true);
  const [showEmpty, setShowEmpty] = useState(false);
  const abortRef = useRef(null);

  const handleGenerate = useCallback(async () => {
    // Cancel any in-flight computation
    if (abortRef.current) abortRef.current = false;
    const token = {};
    abortRef.current = token;

    if (!input && !showEmpty) {
      setHash("");
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await sha1(input);
      if (abortRef.current !== token) return; // stale
      setHash(result);
    } catch (e) {
      if (abortRef.current !== token) return;
      setHash("");
      setError(e.message || "Failed to compute SHA-1 hash.");
    } finally {
      if (abortRef.current === token) setLoading(false);
    }
  }, [input, showEmpty]);

  // Auto hash with debounce
  useEffect(() => {
    if (!autoHash) return;
    const t = setTimeout(handleGenerate, 250);
    return () => clearTimeout(t);
  }, [input, autoHash, handleGenerate]);

  // Re-run when showEmpty changes
  useEffect(() => {
    if (showEmpty || input) handleGenerate();
  }, [showEmpty]);

  // Ctrl+Enter
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleGenerate();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleGenerate]);

  const display = uppercase && hash ? hash.toUpperCase() : hash;

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleGenerate}
          data-primary="true"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          {loading ? (
            <>
              <svg width="15" height="15" className="animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Hashing...
            </>
          ) : (
            <>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate SHA-1
            </>
          )}
        </button>

        <Toggle
          checked={uppercase}
          onChange={setUppercase}
          label="Uppercase"
        />

        <Toggle
          checked={autoHash}
          onChange={setAutoHash}
          label="Auto hash"
        />

        <Toggle
          checked={showEmpty}
          onChange={setShowEmpty}
          label="Hash empty string"
          description="Compute SHA-1 of empty string: da39a3ee..."
        />

        {/* Sample buttons */}
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {SAMPLES.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setInput(s.value);
                setHash("");
                setError(null);
              }}
              className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 cursor-pointer transition-colors whitespace-nowrap"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex flex-col">
        <PanelHeader
          label="Input"
          meta={input ? `${input.length.toLocaleString()} chars · ${new TextEncoder().encode(input).length} bytes` : null}
          actions={
            input && (
              <button
                onClick={() => { setInput(""); setHash(""); setError(null); }}
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
          placeholder={`Type or paste text to hash...\n\nExamples:\n• Any string, sentence or paragraph\n• Binary or Unicode text\n• File path or URL\n• API response data`}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[160px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
          <svg width="14" height="14" className="animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-xs text-blue-700 font-medium">Computing SHA-1...</p>
        </div>
      )}

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Hash output */}
      {display && !loading && (
        <HashCard hash={display} uppercase={false} />
      )}

      {/* Stats */}
      {hash && !loading && (
        <StatsRow input={input} hash={hash} />
      )}
    </div>
  );
}

// ============================================================
// VERIFY SECTION
// ============================================================

function VerifySection() {
  const [input,    setInput]    = useState("");
  const [expected, setExpected] = useState("");
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  async function handleVerify() {
    if (!input.trim()) {
      setError("Please enter the text to verify.");
      setResult(null);
      return;
    }

    if (!expected.trim()) {
      setError("Please enter the expected SHA-1 hash.");
      setResult(null);
      return;
    }

    const cleanExpected = expected.trim().toLowerCase();

    if (!/^[a-f0-9]{40}$/.test(cleanExpected)) {
      setError(
        "Invalid SHA-1 hash format. SHA-1 hashes are exactly 40 hexadecimal characters."
      );
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const computed = await sha1(input.trim());
      const matches  = computed === cleanExpected;
      setResult({ computed, expected: cleanExpected, matches });
    } catch (e) {
      setError(e.message || "Failed to compute SHA-1 hash.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleVerify();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [input, expected]);

  function isExpectedValid() {
    const v = expected.trim().toLowerCase();
    return v.length === 0 || /^[a-f0-9]{0,40}$/.test(v);
  }

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleVerify}
          data-primary="true"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          {loading ? (
            <>
              <svg width="15" height="15" className="animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verifying...
            </>
          ) : (
            <>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Verify Hash
            </>
          )}
        </button>

        {/* Quick known hashes */}
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {KNOWN_HASHES.slice(0, 3).map((kh) => (
            <button
              key={kh.hash}
              onClick={() => {
                setInput(kh.input);
                setExpected(kh.hash);
                setResult(null);
                setError(null);
              }}
              className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 cursor-pointer transition-colors whitespace-nowrap"
            >
              {kh.input ? `"${kh.input}"` : "(empty)"}
            </button>
          ))}
        </div>
      </div>

      {/* Two inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input text */}
        <div className="flex flex-col">
          <PanelHeader
            label="Input Text"
            meta={input ? `${input.length.toLocaleString()} chars` : null}
            actions={
              input && (
                <button
                  onClick={() => { setInput(""); setResult(null); if (error) setError(null); }}
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
              setResult(null);
              if (error) setError(null);
            }}
            placeholder="Enter the original text to verify..."
            spellCheck={false}
            autoCorrect="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
          />
        </div>

        {/* Expected hash */}
        <div className="flex flex-col">
          <PanelHeader
            label="Expected SHA-1 Hash"
            meta={
              expected.trim()
                ? isExpectedValid()
                  ? expected.trim().length === 40
                    ? "Valid format ✓"
                    : `${expected.trim().length}/40 chars`
                  : "Invalid format ✗"
                : null
            }
            actions={
              expected && (
                <button
                  onClick={() => { setExpected(""); setResult(null); if (error) setError(null); }}
                  className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )
            }
          />
          <textarea
            value={expected}
            onChange={(e) => {
              setExpected(e.target.value);
              setResult(null);
              if (error) setError(null);
            }}
            placeholder={"Paste the expected SHA-1 hash...\n\n40 hexadecimal characters\nExample:\nda39a3ee5e6b4b0d3255bfef95601890afd80709"}
            spellCheck={false}
            autoCorrect="off"
            maxLength={40}
            className={`flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none resize-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs ${
              expected.trim().length > 0 && !isExpectedValid()
                ? "border-red-300 focus:border-red-400"
                : expected.trim().length === 40
                ? "border-green-300 focus:border-green-400"
                : "border-gray-200"
            }`}
          />
        </div>
      </div>

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Result card */}
      {result && (
        <div className={`border-2 rounded-xl overflow-hidden ${
          result.matches
            ? "border-green-300"
            : "border-red-300"
        }`}>
          {/* Status header */}
          <div className={`flex items-center gap-3 px-5 py-4 ${
            result.matches ? "bg-green-50" : "bg-red-50"
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              result.matches ? "bg-green-100" : "bg-red-100"
            }`}>
              {result.matches ? (
                <svg width="20" height="20" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className={`text-base font-bold ${result.matches ? "text-green-800" : "text-red-800"}`}>
                {result.matches
                  ? "✓ Hash Match — Integrity Verified"
                  : "✗ Hash Mismatch — Integrity Check Failed"}
              </p>
              <p className={`text-xs mt-0.5 ${result.matches ? "text-green-600" : "text-red-600"}`}>
                {result.matches
                  ? "The computed SHA-1 hash matches the expected hash exactly."
                  : "The computed SHA-1 hash does not match the expected hash."}
              </p>
            </div>
          </div>

          {/* Hash comparison table */}
          <div className="divide-y divide-gray-100 bg-white">
            {[
              { label: "Computed",  value: result.computed,  highlight: !result.matches },
              { label: "Expected",  value: result.expected,  highlight: false           },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs font-bold text-gray-400 w-20 flex-shrink-0 uppercase tracking-wider">
                  {label}:
                </span>
                <code className={`text-xs sm:text-sm font-mono font-bold tracking-wider flex-1 break-all ${
                  result.matches
                    ? "text-green-700"
                    : highlight
                    ? "text-red-700"
                    : "text-gray-700"
                }`}>
                  {value}
                </code>
                <CopyButton text={value} />
              </div>
            ))}
          </div>

          {/* Diff view if mismatch */}
          {!result.matches && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Character diff:
              </p>
              <div className="flex flex-wrap gap-0.5">
                {result.computed.split("").map((char, i) => (
                  <span
                    key={i}
                    className={`text-xs font-mono px-0.5 rounded ${
                      char === result.expected[i]
                        ? "text-gray-400"
                        : "bg-red-100 text-red-700 font-bold"
                    }`}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FILE HASH SECTION
// ============================================================

function FileHashSection() {
  const [hash,      setHash]      = useState("");
  const [error,     setError]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [fileInfo,  setFileInfo]  = useState(null);
  const [uppercase, setUppercase] = useState(false);
  const [dragging,  setDragging]  = useState(false);
  const [progress,  setProgress]  = useState(0);
  const inputRef = useRef(null);

  function formatSize(bytes) {
    if (bytes < 1024)         return `${bytes} B`;
    if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  async function processFile(file) {
    setError(null);
    setHash("");
    setProgress(0);

    if (!file) return;

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      setError(
        `File too large. Maximum size is 100MB. Your file is ${formatSize(file.size)}.`
      );
      return;
    }

    setLoading(true);
    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      lastModified: new Date(file.lastModified).toLocaleDateString(),
    });

    try {
      // Use Web Crypto for files (handles ArrayBuffer directly)
      if (window.crypto?.subtle) {
        const arrayBuf = await file.arrayBuffer();
        setProgress(50);
        const hashBuf  = await window.crypto.subtle.digest("SHA-1", arrayBuf);
        setProgress(90);
        const result   = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        setHash(result);
        setProgress(100);
      } else {
        // Fallback: read as text
        const text = await readFileAsText(file);
        setProgress(50);
        const result = await sha1(text);
        setProgress(100);
        setHash(result);
      }
    } catch (e) {
      setError("Failed to hash file: " + (e.message || "Unknown error"));
      setHash("");
    } finally {
      setLoading(false);
    }
  }

  const display = uppercase && hash ? hash.toUpperCase() : hash;

  return (
    <div className="space-y-4">

      {/* Options */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <Toggle
          checked={uppercase}
          onChange={setUppercase}
          label="Uppercase output"
        />
        <span className="text-xs text-gray-400 ml-2">
          Supports any file type up to 100MB
        </span>
        {fileInfo && (
          <button
            onClick={() => {
              setHash("");
              setFileInfo(null);
              setError(null);
              setProgress(0);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="ml-auto text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-gray-200"
          >
            Clear file
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) processFile(file);
        }}
        onClick={() => !loading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 py-14 border-2 border-dashed rounded-xl transition-all ${
          loading
            ? "border-blue-300 bg-blue-50 cursor-default"
            : dragging
            ? "border-blue-400 bg-blue-50 scale-[1.01] cursor-copy"
            : fileInfo
            ? "border-green-300 bg-green-50 cursor-pointer"
            : "border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <svg width="24" height="24" className="animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-blue-700">Computing SHA-1...</p>
            <div className="w-full bg-blue-100 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-blue-500">{fileInfo?.name}</p>
          </div>
        ) : fileInfo ? (
          <>
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
  <FileText size={22} className="text-green-600" />
</div>
            <div className="text-center">
              <p className="text-sm font-semibold text-green-700 break-all max-w-xs">
                {fileInfo.name}
              </p>
              <p className="text-xs text-green-500 mt-1">
                {formatSize(fileInfo.size)} · {fileInfo.type}
              </p>
              <p className="text-xs text-green-400 mt-0.5">
                Modified: {fileInfo.lastModified} · Click to change
              </p>
            </div>
          </>
        ) : (
          <>
           <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-sm">
  <Folder size={28} className="text-gray-500" />
</div>
            <div className="text-center px-6">
              <p className="text-sm font-semibold text-gray-600">
                {dragging ? "Drop to compute SHA-1" : "Drop any file or click to browse"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Any file type · Max 100MB · Uses Web Crypto API
              </p>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Hash result */}
      {display && !loading && (
        <HashCard
          hash={display}
          uppercase={false}
          fileName={fileInfo?.name}
        />
      )}

      {/* File stats */}
      {fileInfo && hash && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "File name",     value: fileInfo.name                   },
            { label: "File size",     value: formatSize(fileInfo.size)       },
            { label: "File type",     value: fileInfo.type                   },
            { label: "Last modified", value: fileInfo.lastModified           },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="text-xs text-gray-400 font-medium">{label}</span>
              <span className="text-xs font-semibold font-mono text-gray-700 truncate" title={value}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPARE SECTION — hash two strings and compare
// ============================================================

function CompareSection() {
  const [inputA,   setInputA]   = useState("");
  const [inputB,   setInputB]   = useState("");
  const [hashA,    setHashA]    = useState("");
  const [hashB,    setHashB]    = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [compared, setCompared] = useState(false);

  async function handleCompare() {
    if (!inputA.trim() && !inputB.trim()) {
      setError("Please enter text in at least one of the inputs.");
      return;
    }

    setLoading(true);
    setError(null);
    setCompared(false);

    try {
      const [ha, hb] = await Promise.all([
        sha1(inputA),
        sha1(inputB),
      ]);
      setHashA(ha);
      setHashB(hb);
      setCompared(true);
    } catch (e) {
      setError(e.message || "Failed to compute SHA-1 hashes.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-compare with debounce
  useEffect(() => {
    if (!inputA && !inputB) return;
    const t = setTimeout(handleCompare, 400);
    return () => clearTimeout(t);
  }, [inputA, inputB]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleCompare();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inputA, inputB]);

  const match  = compared && hashA && hashB && hashA === hashB;
  const differ = compared && hashA && hashB && hashA !== hashB;

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleCompare}
          data-primary="true"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          {loading ? (
            <>
              <svg width="15" height="15" className="animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Comparing...
            </>
          ) : (
            <>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compare Hashes
            </>
          )}
        </button>
        <span className="text-xs text-gray-400">
          Hash both inputs and compare — auto-updates as you type
        </span>
        <button
          onClick={() => {
            setInputA(""); setInputB("");
            setHashA(""); setHashB("");
            setCompared(false);
            setError(null);
          }}
          className="ml-auto text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-gray-200"
        >
          Clear all
        </button>
      </div>

      {/* Two inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { label: "Input A", value: inputA, onChange: (v) => { setInputA(v); setCompared(false); }, hash: hashA },
          { label: "Input B", value: inputB, onChange: (v) => { setInputB(v); setCompared(false); }, hash: hashB },
        ].map(({ label, value, onChange, hash }, idx) => (
          <div key={label} className="flex flex-col gap-2">
            {/* Textarea */}
            <div className="flex flex-col">
              <PanelHeader
                label={label}
                meta={value ? `${value.length.toLocaleString()} chars` : null}
                actions={
                  value && (
                    <button
                      onClick={() => { onChange(""); }}
                      className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  )
                }
              />
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`Paste text ${label.split(" ")[1]}...`}
                spellCheck={false}
                autoCorrect="off"
                className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[120px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
              />
            </div>

            {/* Hash output */}
            {hash && compared && (
              <div className={`px-4 py-3 rounded-xl border font-mono text-xs break-all ${
                match
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}>
                <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                  SHA-1
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all font-bold tracking-wider">{hash}</code>
                  <CopyButton text={hash} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Match result banner */}
      {compared && (match || differ) && (
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 ${
          match
            ? "bg-green-50 border-green-300"
            : "bg-red-50 border-red-300"
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            match ? "bg-green-100" : "bg-red-100"
          }`}>
            {match ? (
              <svg width="20" height="20" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div>
            <p className={`font-bold text-base ${match ? "text-green-800" : "text-red-800"}`}>
              {match
                ? "✓ Identical — Both inputs produce the same SHA-1 hash"
                : "✗ Different — Inputs produce different SHA-1 hashes"}
            </p>
            <p className={`text-xs mt-0.5 ${match ? "text-green-600" : "text-red-600"}`}>
              {match
                ? "Both strings are semantically identical (or have the same byte representation)."
                : "Even a single character difference produces a completely different hash."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Sha1Generator() {
  const [activeTab, setActiveTab] = useState("generate");

  return (
    <div className="space-y-5">

      {/* Security warning */}
      <SecurityWarning />

      {/* Section tabs */}
      <SectionTabs active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === "generate" && <GenerateSection />}
      {activeTab === "verify"   && <VerifySection />}
      {activeTab === "file"     && <FileHashSection />}
      {activeTab === "compare"  && <CompareSection />}

    </div>
  );
}