"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard, downloadText, readFileAsText } from "@/lib/helpers";
import { Zap, CheckCircle, Folder } from "lucide-react";

// ============================================================
// MD5 IMPLEMENTATION
// Pure JS — no external dependency needed
// RFC 1321 compliant
// ============================================================

function md5(input) {
  function safeAdd(x, y) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }

  function bitRotateLeft(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  function md5cmn(q, a, b, x, s, t) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }

  function md5ff(a, b, c, d, x, s, t) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function md5gg(a, b, c, d, x, s, t) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function md5hh(a, b, c, d, x, s, t) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function md5ii(a, b, c, d, x, s, t) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] =
        s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  function md5blkArray(a) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] =
        a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
    }
    return md5blks;
  }

  function md51(s) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
    }
    tail[i >> 2] |= 0x80 << (i % 4 << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md51Array(a) {
    const n = a.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blkArray(a.slice(i - 64, i)));
    }
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let j = 0; j < n - i + 64; j++) {
      tail[j >> 2] |= a[i - 64 + j] << (j % 4 << 3);
    }
    tail[(n - i + 64) >> 2] |= 0x80 << ((n - i + 64) % 4 << 3);
    if (n - i + 64 > 55) {
      md5cycle(state, tail);
      for (let k = 0; k < 16; k++) tail[k] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5cycle(x, k) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = md5ff(a, b, c, d, k[0],  7,  -680876936);
    d = md5ff(d, a, b, c, k[1],  12, -389564586);
    c = md5ff(c, d, a, b, k[2],  17,  606105819);
    b = md5ff(b, c, d, a, k[3],  22, -1044525330);
    a = md5ff(a, b, c, d, k[4],  7,  -176418897);
    d = md5ff(d, a, b, c, k[5],  12,  1200080426);
    c = md5ff(c, d, a, b, k[6],  17, -1473231341);
    b = md5ff(b, c, d, a, k[7],  22, -45705983);
    a = md5ff(a, b, c, d, k[8],  7,   1770035416);
    d = md5ff(d, a, b, c, k[9],  12, -1958414417);
    c = md5ff(c, d, a, b, k[10], 17, -42063);
    b = md5ff(b, c, d, a, k[11], 22, -1990404162);
    a = md5ff(a, b, c, d, k[12], 7,   1804603682);
    d = md5ff(d, a, b, c, k[13], 12, -40341101);
    c = md5ff(c, d, a, b, k[14], 17, -1502002290);
    b = md5ff(b, c, d, a, k[15], 22,  1236535329);
    a = md5gg(a, b, c, d, k[1],  5,  -165796510);
    d = md5gg(d, a, b, c, k[6],  9,  -1069501632);
    c = md5gg(c, d, a, b, k[11], 14,  643717713);
    b = md5gg(b, c, d, a, k[0],  20, -373897302);
    a = md5gg(a, b, c, d, k[5],  5,  -701558691);
    d = md5gg(d, a, b, c, k[10], 9,   38016083);
    c = md5gg(c, d, a, b, k[15], 14, -660478335);
    b = md5gg(b, c, d, a, k[4],  20, -405537848);
    a = md5gg(a, b, c, d, k[9],  5,   568446438);
    d = md5gg(d, a, b, c, k[14], 9,  -1019803690);
    c = md5gg(c, d, a, b, k[3],  14, -187363961);
    b = md5gg(b, c, d, a, k[8],  20,  1163531501);
    a = md5gg(a, b, c, d, k[13], 5,  -1444681467);
    d = md5gg(d, a, b, c, k[2],  9,  -51403784);
    c = md5gg(c, d, a, b, k[7],  14,  1735328473);
    b = md5gg(b, c, d, a, k[12], 20, -1926607734);
    a = md5hh(a, b, c, d, k[5],  4,  -378558);
    d = md5hh(d, a, b, c, k[8],  11, -2022574463);
    c = md5hh(c, d, a, b, k[11], 16,  1839030562);
    b = md5hh(b, c, d, a, k[14], 23, -35309556);
    a = md5hh(a, b, c, d, k[1],  4,  -1530992060);
    d = md5hh(d, a, b, c, k[4],  11,  1272893353);
    c = md5hh(c, d, a, b, k[7],  16, -155497632);
    b = md5hh(b, c, d, a, k[10], 23, -1094730640);
    a = md5hh(a, b, c, d, k[13], 4,   681279174);
    d = md5hh(d, a, b, c, k[0],  11, -358537222);
    c = md5hh(c, d, a, b, k[3],  16, -722521979);
    b = md5hh(b, c, d, a, k[6],  23,  76029189);
    a = md5hh(a, b, c, d, k[9],  4,  -640364487);
    d = md5hh(d, a, b, c, k[12], 11, -421815835);
    c = md5hh(c, d, a, b, k[15], 16,  530742520);
    b = md5hh(b, c, d, a, k[2],  23, -995338651);
    a = md5ii(a, b, c, d, k[0],  6,  -198630844);
    d = md5ii(d, a, b, c, k[7],  10,  1126891415);
    c = md5ii(c, d, a, b, k[14], 15, -1416354905);
    b = md5ii(b, c, d, a, k[5],  21, -57434055);
    a = md5ii(a, b, c, d, k[12], 6,   1700485571);
    d = md5ii(d, a, b, c, k[3],  10, -1894986606);
    c = md5ii(c, d, a, b, k[10], 15, -1051523);
    b = md5ii(b, c, d, a, k[1],  21, -2054922799);
    a = md5ii(a, b, c, d, k[8],  6,   1873313359);
    d = md5ii(d, a, b, c, k[15], 10, -30611744);
    c = md5ii(c, d, a, b, k[6],  15, -1560198380);
    b = md5ii(b, c, d, a, k[13], 21,  1309151649);
    a = md5ii(a, b, c, d, k[4],  6,  -145523070);
    d = md5ii(d, a, b, c, k[11], 10, -1120210379);
    c = md5ii(c, d, a, b, k[2],  15,  718787259);
    b = md5ii(b, c, d, a, k[9],  21, -343485551);
    x[0] = safeAdd(a, x[0]);
    x[1] = safeAdd(b, x[1]);
    x[2] = safeAdd(c, x[2]);
    x[3] = safeAdd(d, x[3]);
  }

  function rhex(n) {
    const hex_chr = "0123456789abcdef";
    let s = "";
    for (let j = 0; j < 4; j++) {
      s +=
        hex_chr.charAt((n >> (j * 8 + 4)) & 0x0f) +
        hex_chr.charAt((n >> (j * 8)) & 0x0f);
    }
    return s;
  }

  function hex(x) {
    return x.map(rhex).join("");
  }

  function str2rstrUTF8(str) {
    return unescape(encodeURIComponent(str));
  }

  try {
    return hex(md51(str2rstrUTF8(input)));
  } catch (e) {
    throw new Error("MD5 computation failed: " + e.message);
  }
}

// ============================================================
// CONSTANTS
// ============================================================

const SAMPLES = [
  { label: "Empty string",  value: ""              },
  { label: "Hello World",   value: "Hello, World!" },
  { label: "DevTools",      value: "DevTools"       },
  { label: "Numbers",       value: "1234567890"     },
  { label: "Lorem ipsum",   value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
];

const KNOWN_HASHES = [
  { input: "",              hash: "d41d8cd98f00b204e9800998ecf8427e" },
  { input: "hello",         hash: "5d41402abc4b2a76b9719d911017c592" },
  { input: "Hello, World!", hash: "65a8e27d8879283831b664bd8b7f0ad4" },
  { input: "password",      hash: "5f4dcc3b5aa765d61d8327deb882cf99" },
  { input: "123456",        hash: "e10adc3949ba59abbe56e057f20f883e" },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Section tabs ──────────────────────────────────────────────
function SectionTabs({ active, onChange }) {
  const tabs = [
    { value: "generate", label: "Generate",  icon: Zap },
    { value: "verify",   label: "Verify",    icon: CheckCircle },
    { value: "file",     label: "File Hash", icon: Folder },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;

        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
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

// ── Copy button ───────────────────────────────────────────────
function CopyButton({ text, label = "Copy", size = "default" }) {
  const [state, setState] = useState("idle");

  async function handleCopy() {
    if (!text) return;
    const ok = await copyToClipboard(text);
    setState(ok ? "copied" : "error");
    setTimeout(() => setState("idle"), 2000);
  }

  const base = "inline-flex items-center gap-1.5 font-medium cursor-pointer rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = {
    default: "px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700",
    lg:      "px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700",
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      className={`${base} ${sizes[size]}`}
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

// ── Toggle ────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`} />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );
}

// ── Error banner ──────────────────────────────────────────────
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

// ── Hash display card ─────────────────────────────────────────
function HashCard({ hash, uppercase, label = "MD5 Hash" }) {
  const display = uppercase ? hash.toUpperCase() : hash;

  if (!hash) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            {label}
          </span>
          <span className="text-xs text-gray-400">128-bit · 32 hex chars</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CopyButton text={display} />
        </div>
      </div>

      {/* Hash value */}
      <div className="px-4 py-4 bg-white">
        <div className="flex items-center gap-3">
          <code className="flex-1 text-sm font-mono font-bold text-gray-900 break-all leading-relaxed tracking-wider">
            {display}
          </code>
        </div>

        {/* Byte segments */}
        <div className="flex flex-wrap gap-1 mt-3">
          {(display.match(/.{1,8}/g) || []).map((chunk, i) => (
            <span
              key={i}
              className={`text-xs font-mono px-2 py-1 rounded-lg border ${
                i % 4 === 0 ? "bg-blue-50 border-blue-200 text-blue-700" :
                i % 4 === 1 ? "bg-purple-50 border-purple-200 text-purple-700" :
                i % 4 === 2 ? "bg-green-50 border-green-200 text-green-700" :
                              "bg-orange-50 border-orange-200 text-orange-700"
              }`}
            >
              {chunk}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Stats row ─────────────────────────────────────────────────
function StatsRow({ input, hash }) {
  if (!hash) return null;

  const bytes = new TextEncoder().encode(input).length;

  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {[
        { label: "Input chars",   value: input.length.toLocaleString() },
        { label: "Input bytes",   value: bytes.toLocaleString()        },
        { label: "Hash length",   value: "32 chars"                    },
        { label: "Hash bits",     value: "128 bits"                    },
        { label: "Algorithm",     value: "MD5 (RFC 1321)"              },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className="font-mono font-semibold text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Warning banner ────────────────────────────────────────────
function SecurityWarning() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
      <svg width="16" height="16" className="flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <p className="text-xs font-bold text-amber-800">Security Notice</p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          MD5 is <strong>cryptographically broken</strong> and should not be used for password hashing or security-critical applications. Use SHA-256, bcrypt, or Argon2 for passwords. MD5 is only suitable for checksums and non-security data integrity checks.
        </p>
      </div>
    </div>
  );
}

// ── Generate section ──────────────────────────────────────────
function GenerateSection() {
  const [input,     setInput]     = useState("");
  const [hash,      setHash]      = useState("");
  const [error,     setError]     = useState(null);
  const [uppercase, setUppercase] = useState(false);
  const [autoHash,  setAutoHash]  = useState(true);
  const [showEmpty, setShowEmpty] = useState(false);

  const handleGenerate = useCallback(() => {
    // Allow empty string hashing when explicitly enabled
    if (!input && !showEmpty) {
      setHash("");
      setError(null);
      return;
    }

    try {
      const result = md5(input);
      setHash(result);
      setError(null);
    } catch (e) {
      setHash("");
      setError(e.message || "Failed to compute MD5 hash.");
    }
  }, [input, showEmpty]);

  useEffect(() => {
    if (!autoHash) return;
    const t = setTimeout(handleGenerate, 200);
    return () => clearTimeout(t);
  }, [input, autoHash, handleGenerate]);

  useEffect(() => {
    if (input || showEmpty) handleGenerate();
  }, [uppercase]);

  useEffect(() => {
    if (showEmpty) handleGenerate();
  }, [showEmpty]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleGenerate();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleGenerate]);

  return (
    <div className="space-y-4">

      {/* Options bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleGenerate}
          data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate MD5
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
        />

        {/* Quick samples */}
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {SAMPLES.filter((s) => s.value).map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setInput(s.value);
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
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Input</span>
            {input && (
              <span className="text-xs text-gray-400">
                {input.length.toLocaleString()} chars · {new TextEncoder().encode(input).length} bytes
              </span>
            )}
          </div>
          {input && (
            <button
              onClick={() => { setInput(""); setHash(""); setError(null); }}
              className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError(null);
          }}
          placeholder={`Type or paste text to hash...\n\nExamples:\n• Any text string\n• Passwords (for educational purposes only)\n• File contents\n• API keys or tokens`}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[160px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
        />
      </div>

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Hash output */}
      {(hash || (showEmpty && !error)) && (
        <HashCard
          hash={hash}
          uppercase={uppercase}
          label="MD5 Hash"
        />
      )}

      {/* Stats */}
      <StatsRow input={input} hash={hash} />
    </div>
  );
}

// ── Verify section ────────────────────────────────────────────
function VerifySection() {
  const [input,    setInput]    = useState("");
  const [expected, setExpected] = useState("");
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  function handleVerify() {
    if (!input.trim()) {
      setError("Please enter the text to verify.");
      setResult(null);
      return;
    }

    if (!expected.trim()) {
      setError("Please enter the expected MD5 hash.");
      setResult(null);
      return;
    }

    const cleanExpected = expected.trim().toLowerCase();

    if (!/^[a-f0-9]{32}$/.test(cleanExpected)) {
      setError("Invalid MD5 hash format. MD5 hashes are exactly 32 hexadecimal characters.");
      setResult(null);
      return;
    }

    try {
      const computed = md5(input);
      const matches  = computed === cleanExpected;
      setResult({ computed, matches, input });
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to compute MD5 hash.");
      setResult(null);
    }
  }

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleVerify();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [input, expected]);

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleVerify}
          data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Verify Hash
        </button>
        <span className="text-xs text-gray-400">
          Compute MD5 and compare against expected hash
        </span>
        {/* Known hashes */}
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {KNOWN_HASHES.slice(0, 3).map((kh) => (
            <button
              key={kh.hash}
              onClick={() => {
                setInput(kh.input || "");
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
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Input Text</span>
            {input && (
              <button onClick={() => { setInput(""); setResult(null); }}
                className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">
                Clear
              </button>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setResult(null); if (error) setError(null); }}
            placeholder="Enter the original text..."
            spellCheck={false}
            autoCorrect="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
          />
        </div>

        {/* Expected hash */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expected MD5 Hash</span>
            {expected && (
              <button onClick={() => { setExpected(""); setResult(null); }}
                className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">
                Clear
              </button>
            )}
          </div>
          <input
            type="text"
            value={expected}
            onChange={(e) => { setExpected(e.target.value); setResult(null); if (error) setError(null); }}
            placeholder="Paste expected MD5 hash (32 hex chars)..."
            spellCheck={false}
            maxLength={32}
            className={`flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300 ${
              expected.length > 0 && expected.length !== 32
                ? "border-amber-300"
                : "border-gray-200"
            }`}
          />
        </div>
      </div>

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Result */}
      {result && (
        <div className={`border-2 rounded-xl overflow-hidden ${
          result.matches
            ? "border-green-300 bg-green-50"
            : "border-red-300 bg-red-50"
        }`}>
          {/* Status */}
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
            <div>
              <p className={`text-base font-bold ${result.matches ? "text-green-800" : "text-red-800"}`}>
                {result.matches ? "Hash Match — Integrity Verified ✓" : "Hash Mismatch — Integrity Check Failed ✗"}
              </p>
              <p className={`text-xs mt-0.5 ${result.matches ? "text-green-600" : "text-red-600"}`}>
                {result.matches
                  ? "The computed MD5 hash matches the expected hash exactly."
                  : "The computed MD5 hash does not match the expected hash."}
              </p>
            </div>
          </div>

          {/* Hash comparison */}
          <div className="px-5 py-4 bg-white border-t border-gray-200 space-y-3">
            {[
              { label: "Computed",  value: result.computed,         color: result.matches ? "text-green-700" : "text-red-700" },
              { label: "Expected",  value: expected.toLowerCase(),  color: result.matches ? "text-green-700" : "text-gray-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-20 flex-shrink-0">{label}:</span>
                <code className={`text-sm font-mono font-bold tracking-wider flex-1 break-all ${color}`}>
                  {value}
                </code>
                <CopyButton text={value} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── File hash section ─────────────────────────────────────────
function FileHashSection() {
  const [hash,       setHash]       = useState("");
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [fileInfo,   setFileInfo]   = useState(null);
  const [uppercase,  setUppercase]  = useState(false);
  const [dragging,   setDragging]   = useState(false);
  const inputRef = useRef(null);

  async function processFile(file) {
    setError(null);
    setHash("");
    setFileInfo(null);

    if (!file) return;

    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      setError(`File too large. Maximum size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      return;
    }

    setLoading(true);
    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
    });

    try {
      const text = await readFileAsText(file);
      const result = md5(text);
      setHash(result);
    } catch (e) {
      setError("Failed to read file: " + (e.message || "Unknown error"));
      setHash("");
    } finally {
      setLoading(false);
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024)         return `${bytes} B`;
    if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
          Supports text files up to 50MB
        </span>
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
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 py-12 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          dragging
            ? "border-blue-400 bg-blue-50 scale-[1.01]"
            : fileInfo
            ? "border-green-300 bg-green-50"
            : "border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/30"
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
          <>
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <svg width="24" height="24" className="animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-blue-700">Computing MD5...</p>
              <p className="text-xs text-blue-500 mt-0.5">{fileInfo?.name}</p>
            </div>
          </>
        ) : fileInfo ? (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-2xl">
              📄
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-green-700">{fileInfo.name}</p>
              <p className="text-xs text-green-500 mt-0.5">
                {formatSize(fileInfo.size)} · {fileInfo.type} · Click to change
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
                {dragging ? "Drop file to hash" : "Drop a file or click to browse"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Any text file · Max 50MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Hash output */}
      {display && (
        <HashCard
          hash={display}
          uppercase={false}
          label={`MD5 of ${fileInfo?.name ?? "file"}`}
        />
      )}

      {/* File stats */}
      {fileInfo && hash && (
        <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
          {[
            { label: "File",      value: fileInfo.name                  },
            { label: "Size",      value: formatSize(fileInfo.size)      },
            { label: "Type",      value: fileInfo.type || "unknown"     },
            { label: "Hash bits", value: "128 bits"                     },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400">{label}:</span>
              <span className="font-mono font-semibold text-gray-700 truncate max-w-[200px]">{value}</span>
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

export default function Md5Generator() {
  const [activeTab, setActiveTab] = useState("generate");

  return (
    <div className="space-y-5">

      {/* ── Security warning ─────────────────────────────────── */}
      <SecurityWarning />

      {/* ── Section tabs ─────────────────────────────────────── */}
      <SectionTabs active={activeTab} onChange={setActiveTab} />

      {/* ── Tab content ──────────────────────────────────────── */}
      {activeTab === "generate" && <GenerateSection />}
      {activeTab === "verify"   && <VerifySection />}
      {activeTab === "file"     && <FileHashSection />}

    </div>
  );
}