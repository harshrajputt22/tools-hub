"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// HMAC IMPLEMENTATION
// Uses Web Crypto API — RFC 2104 compliant
// Supports: SHA-1, SHA-256, SHA-384, SHA-512
// ============================================================

const SUPPORTED_ALGORITHMS = {
  "SHA-1":   { subtleName: "SHA-1",   bits: 160, hex: 40  },
  "SHA-256": { subtleName: "SHA-256", bits: 256, hex: 64  },
  "SHA-384": { subtleName: "SHA-384", bits: 384, hex: 96  },
  "SHA-512": { subtleName: "SHA-512", bits: 512, hex: 128 },
};

async function computeHmac(message, secret, algorithm = "SHA-256") {
  if (!window.crypto?.subtle) {
    throw new Error(
      "Web Crypto API is not available. HMAC requires a secure context (HTTPS or localhost)."
    );
  }

  const algo    = SUPPORTED_ALGORITHMS[algorithm];
  if (!algo) throw new Error(`Unsupported algorithm: ${algorithm}`);

  const enc     = new TextEncoder();
  const keyMat  = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: algo.subtleName },
    false,
    ["sign", "verify"]
  );

  const sig = await window.crypto.subtle.sign(
    "HMAC",
    keyMat,
    enc.encode(message)
  );

  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const base64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  const base64url = base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return { hex, base64, base64url, bits: algo.bits };
}

async function verifyHmac(message, secret, algorithm, expectedHex) {
  if (!window.crypto?.subtle) {
    throw new Error("Web Crypto API not available.");
  }

  const algo   = SUPPORTED_ALGORITHMS[algorithm];
  if (!algo) throw new Error(`Unsupported algorithm: ${algorithm}`);

  const enc    = new TextEncoder();
  const keyMat = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: algo.subtleName },
    false,
    ["sign", "verify"]
  );

  // Convert expected hex to Uint8Array
  const expectedBytes = new Uint8Array(
    expectedHex.match(/.{2}/g).map((b) => parseInt(b, 16))
  );

  return window.crypto.subtle.verify(
    "HMAC",
    keyMat,
    expectedBytes,
    enc.encode(message)
  );
}

// ============================================================
// CONSTANTS
// ============================================================

const ALGORITHM_OPTIONS = [
  {
    value:    "SHA-256",
    label:    "HMAC-SHA256",
    bits:     256,
    hex:      64,
    security: "Recommended",
    color:    "text-green-700 bg-green-50 border-green-200",
    active:   "bg-green-600 text-white",
    desc:     "Most widely used — JWT, API signing, webhooks",
  },
  {
    value:    "SHA-512",
    label:    "HMAC-SHA512",
    bits:     512,
    hex:      128,
    security: "Maximum",
    color:    "text-blue-700 bg-blue-50 border-blue-200",
    active:   "bg-blue-600 text-white",
    desc:     "Highest security — critical systems",
  },
  {
    value:    "SHA-384",
    label:    "HMAC-SHA384",
    bits:     384,
    hex:      96,
    security: "Strong",
    color:    "text-indigo-700 bg-indigo-50 border-indigo-200",
    active:   "bg-indigo-600 text-white",
    desc:     "High security — TLS, certificates",
  },
  {
    value:    "SHA-1",
    label:    "HMAC-SHA1",
    bits:     160,
    hex:      40,
    security: "Legacy",
    color:    "text-amber-700 bg-amber-50 border-amber-200",
    active:   "bg-amber-500 text-white",
    desc:     "Legacy systems only — not recommended",
  },
];

const OUTPUT_FORMAT_OPTIONS = [
  { value: "hex",       label: "Hex",        desc: "Lowercase hexadecimal"    },
  { value: "HEX",       label: "HEX",        desc: "Uppercase hexadecimal"    },
  { value: "base64",    label: "Base64",     desc: "Standard Base64 encoding" },
  { value: "base64url", label: "Base64URL",  desc: "URL-safe Base64 (no padding, JWT-compatible)" },
];

const USE_CASES = [
  {
    name:    "JWT Signature",
    message: '{"alg":"HS256","typ":"JWT"}.{"sub":"1234567890","name":"John Doe","iat":1516239022}',
    secret:  "your-256-bit-secret",
    algo:    "SHA-256",
    desc:    "JSON Web Token payload signing",
  },
  {
    name:    "Webhook Verification",
    message: '{"event":"payment.completed","amount":99.99,"currency":"USD","timestamp":1703123456}',
    secret:  "whsec_myWebhookSecretKey123",
    algo:    "SHA-256",
    desc:    "GitHub, Stripe, PayPal-style webhook signing",
  },
  {
    name:    "API Request Signing",
    message: "GET\n/api/v1/users\n1703123456\napplication/json",
    secret:  "sk_live_apiSecretKey",
    algo:    "SHA-256",
    desc:    "AWS Signature-style API authentication",
  },
  {
    name:    "File Integrity",
    message: "filename=backup.tar.gz;size=1048576;checksum=abc123",
    secret:  "fileIntegrityKey2024",
    algo:    "SHA-512",
    desc:    "Authenticated file integrity verification",
  },
];

// ============================================================
// HELPERS
// ============================================================

function getAlgorithmOption(value) {
  return ALGORITHM_OPTIONS.find((a) => a.value === value) || ALGORITHM_OPTIONS[0];
}

function formatKeyStrength(keyLength) {
  if (keyLength === 0)   return { label: "No key",    color: "text-gray-400"   };
  if (keyLength < 16)    return { label: "Too short", color: "text-red-600"    };
  if (keyLength < 32)    return { label: "Weak",      color: "text-amber-600"  };
  if (keyLength < 64)    return { label: "Good",      color: "text-green-600"  };
  return                        { label: "Strong",    color: "text-emerald-600" };
}

function generateSecureKey(bytes = 32) {
  const arr = new Uint8Array(bytes);
  window.crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Section tabs ──────────────────────────────────────────────
function SectionTabs({ active, onChange }) {
  const tabs = [
    { value: "generate", label: "Generate" },
    { value: "verify",   label: "Verify" },
    { value: "compare",  label: "Compare" },
    { value: "usecases", label: "Use Cases" },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
            active === tab.value
              ? "bg-white text-blue-700 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span>{tab.label}</span>
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

// ── Loading bar ───────────────────────────────────────────────
function LoadingBar({ message = "Computing HMAC..." }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
      <svg
        width="14"
        height="14"
        className="animate-spin text-blue-500 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-xs font-medium text-blue-700">{message}</p>
    </div>
  );
}

// ── Algorithm selector ────────────────────────────────────────
function AlgorithmSelector({ value, onChange }) {
  const current = getAlgorithmOption(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
          Algorithm:
        </span>
        <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg flex-wrap">
          {ALGORITHM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              title={opt.desc}
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

      {/* Current algo badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${current.color}`}>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="font-bold">{current.label}</span>
        <span>·</span>
        <span>{current.bits}-bit output</span>
        <span>·</span>
        <span>{current.hex} hex chars</span>
        <span>·</span>
        <span className="font-semibold">{current.security}</span>
      </div>
    </div>
  );
}

// ── Key strength indicator ─────────────────────────────────────
function KeyStrengthIndicator({ secret }) {
  if (!secret) return null;

  const bytes  = new TextEncoder().encode(secret).length;
  const bits   = bytes * 8;
  const info   = formatKeyStrength(bytes);

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
      <div className="flex items-center gap-1.5 text-xs">
        <svg width="12" height="12" fill="none" stroke="currentColor" className="text-gray-400" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        <span className="text-gray-400">Key:</span>
        <span className="font-mono font-semibold text-gray-700">{bytes} bytes · {bits} bits</span>
      </div>
      <span className={`text-xs font-bold ${info.color}`}>
        {info.label}
      </span>
      {bytes < 32 && (
        <span className="text-xs text-amber-600 ml-auto">
          ⚠ Recommend ≥32 bytes for {bytes < 16 ? "any" : "strong"} security
        </span>
      )}
    </div>
  );
}

// ── HMAC output card ──────────────────────────────────────────
function HmacOutputCard({ result, algorithm, outputFormat, onFormatChange }) {
  if (!result) return null;

  const algo    = getAlgorithmOption(algorithm);
  const display = outputFormat === "HEX"
    ? result.hex.toUpperCase()
    : outputFormat === "base64"
    ? result.base64
    : outputFormat === "base64url"
    ? result.base64url
    : result.hex;

  const chunks = result.hex.match(/.{1,8}/g) || [];
  const colors = [
    "bg-blue-50 border-blue-200 text-blue-700",
    "bg-purple-50 border-purple-200 text-purple-700",
    "bg-emerald-50 border-emerald-200 text-emerald-700",
    "bg-orange-50 border-orange-200 text-orange-700",
    "bg-rose-50 border-rose-200 text-rose-700",
    "bg-cyan-50 border-cyan-200 text-cyan-700",
    "bg-amber-50 border-amber-200 text-amber-700",
    "bg-indigo-50 border-indigo-200 text-indigo-700",
  ];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            {algo.label} Signature
          </span>
          <span className="text-xs text-gray-400">
            {algo.bits}-bit · {algo.hex} hex chars
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CopyButton text={display} />
          <button
            onClick={() => downloadText(display, `hmac-${algorithm.toLowerCase()}.txt`, "text/plain")}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
          >
            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Save
          </button>
        </div>
      </div>

      {/* Output format switcher */}
      <div className="px-4 py-2.5 bg-gray-50/50 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 whitespace-nowrap">Format:</span>
          <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
            {OUTPUT_FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onFormatChange(opt.value)}
                title={opt.desc}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  outputFormat === opt.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Signature value */}
      <div className="px-4 py-4 bg-white space-y-3">
        <code className="block text-sm font-mono font-bold text-gray-900 break-all leading-relaxed tracking-wide">
          {display}
        </code>

        {/* Byte chunks (hex only) */}
        {(outputFormat === "hex" || outputFormat === "HEX") && (
          <div className="flex flex-wrap gap-1.5">
            {chunks.map((chunk, i) => (
              <span
                key={i}
                title={`Bytes ${i * 4 + 1}–${Math.min((i + 1) * 4, algo.bits / 8)}`}
                className={`text-xs font-mono px-2 py-1 rounded-lg border cursor-default ${colors[i % colors.length]}`}
              >
                {outputFormat === "HEX" ? chunk.toUpperCase() : chunk}
              </span>
            ))}
          </div>
        )}

        {/* All formats comparison */}
        <div className="pt-1 space-y-1.5 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            All formats:
          </p>
          {[
            { label: "Hex (lower)",  value: result.hex            },
            { label: "Hex (upper)",  value: result.hex.toUpperCase() },
            { label: "Base64",       value: result.base64         },
            { label: "Base64URL",    value: result.base64url      },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3 py-1.5 px-3 hover:bg-gray-50 rounded-lg transition-colors">
              <span className="text-xs text-gray-400 w-24 flex-shrink-0">{label}</span>
              <code className="text-xs font-mono text-gray-700 flex-1 break-all">{value}</code>
              <CopyButton text={value} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Secret key input ──────────────────────────────────────────
function SecretKeyInput({ value, onChange, showKey, onShowKeyChange }) {
  const [genLoading, setGenLoading] = useState(false);

  async function handleGenerate() {
    setGenLoading(true);
    try {
      const key = generateSecureKey(32);
      onChange(key);
    } finally {
      setGenLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Secret Key
          </span>
          {value && (
            <span className="text-xs text-gray-400">
              {new TextEncoder().encode(value).length} bytes
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleGenerate}
            disabled={genLoading}
            title="Generate a cryptographically secure random 32-byte key"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-lg cursor-pointer transition-colors disabled:opacity-60"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Generate key
          </button>
          <Toggle
            checked={showKey}
            onChange={onShowKeyChange}
            label="Show"
            description="Toggle key visibility"
          />
          {value && (
            <button
              onClick={() => onChange("")}
              className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {showKey ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={"Enter or generate a secret key...\n\nBest practices:\n• Use ≥32 random bytes for HMAC-SHA256\n• Use ≥64 random bytes for HMAC-SHA512\n• Never reuse keys across different systems\n• Rotate keys regularly\n• Store securely (env vars, secrets manager)"}
          spellCheck={false}
          autoComplete="off"
          className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[120px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
        />
      ) : (
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter secret key (hidden)..."
          spellCheck={false}
          autoComplete="off"
          className="w-full px-4 py-3.5 text-sm font-mono bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none focus:border-blue-400 transition-colors placeholder:text-gray-300"
        />
      )}
    </div>
  );
}

// ── HMAC info banner ──────────────────────────────────────────
function HmacInfoBanner() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
      <svg
        width="16"
        height="16"
        className="flex-shrink-0 mt-0.5 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
      <div>
        <p className="text-xs font-bold text-blue-800">
          HMAC — Hash-based Message Authentication Code (RFC 2104)
        </p>
        <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
          HMAC combines a <strong>secret key</strong> with a <strong>hash function</strong> to produce a message authentication code.
          It provides both <strong>data integrity</strong> (message was not tampered) and <strong>authenticity</strong> (sender knows the secret key).
          Used in JWT signatures, webhook verification, API request signing, and OAuth.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// GENERATE SECTION
// ============================================================

function GenerateSection() {
  const [message,      setMessage]      = useState("");
  const [secret,       setSecret]       = useState("");
  const [algorithm,    setAlgorithm]    = useState("SHA-256");
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [showKey,      setShowKey]      = useState(false);
  const [autoCompute,  setAutoCompute]  = useState(true);
  const [outputFormat, setOutputFormat] = useState("hex");
  const [signHistory,  setSignHistory]  = useState([]);
  const abortRef = useRef(null);

  const handleCompute = useCallback(async () => {
    const token = Symbol("hmac-gen");
    abortRef.current = token;

    if (!message.trim()) {
      setResult(null);
      setError(null);
      return;
    }

    if (!secret.trim()) {
      setError("Please enter a secret key.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await computeHmac(message, secret, algorithm);
      if (abortRef.current !== token) return;
      setResult(res);

      // Add to history
      setSignHistory((prev) => [
        {
          id:        Date.now(),
          algo:      algorithm,
          msgPreview:message.slice(0, 30) + (message.length > 30 ? "..." : ""),
          keyPreview:secret.slice(0, 4) + "***",
          hmac:      res.hex,
          at:        new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 4),
      ]);
    } catch (e) {
      if (abortRef.current !== token) return;
      setResult(null);
      setError(e.message || "HMAC computation failed.");
    } finally {
      if (abortRef.current === token) setLoading(false);
    }
  }, [message, secret, algorithm]);

  // Auto compute with debounce
  useEffect(() => {
    if (!autoCompute) return;
    if (!message.trim() || !secret.trim()) return;
    const t = setTimeout(handleCompute, 300);
    return () => clearTimeout(t);
  }, [message, secret, algorithm, autoCompute, handleCompute]);

  // Ctrl+Enter
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleCompute();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCompute]);

  return (
    <div className="space-y-4">

      {/* Algorithm selector */}
      <AlgorithmSelector value={algorithm} onChange={setAlgorithm} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleCompute}
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
              Computing...
            </>
          ) : (
            <>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Compute HMAC
            </>
          )}
        </button>

        <Toggle
          checked={autoCompute}
          onChange={setAutoCompute}
          label="Auto compute"
          description="Compute HMAC automatically as you type"
        />

        {/* Clear all */}
        {(message || secret || result) && (
          <button
            onClick={() => {
              setMessage("");
              setSecret("");
              setResult(null);
              setError(null);
            }}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg cursor-pointer transition-colors border border-gray-200"
          >
            Clear all
          </button>
        )}

        {/* Kbd hint */}
        <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
        </div>
      </div>

      {/* Message input */}
      <div className="flex flex-col">
        <PanelHeader
          label="Message"
          meta={
            message
              ? `${message.length.toLocaleString()} chars · ${new TextEncoder().encode(message).length} bytes`
              : "The data to authenticate"
          }
          actions={
            message && (
              <button
                onClick={() => { setMessage(""); setResult(null); if (error) setError(null); }}
                className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                Clear
              </button>
            )
          }
        />
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (error) setError(null);
          }}
          placeholder={`Enter the message to sign...\n\nExamples:\n• JSON request body\n• API endpoint + timestamp\n• File contents or path\n• JWT header.payload`}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
        />
      </div>

      {/* Secret key input */}
      <SecretKeyInput
        value={secret}
        onChange={(v) => {
          setSecret(v);
          if (error) setError(null);
        }}
        showKey={showKey}
        onShowKeyChange={setShowKey}
      />

      {/* Key strength */}
      <KeyStrengthIndicator secret={secret} />

      {/* Loading */}
      {loading && <LoadingBar message={`Computing HMAC-${algorithm}...`} />}

      {/* Error */}
      <ErrorBanner message={error} />

      {/* HMAC output */}
      {result && !loading && (
        <HmacOutputCard
          result={result}
          algorithm={algorithm}
          outputFormat={outputFormat}
          onFormatChange={setOutputFormat}
        />
      )}

      {/* Signature history */}
      {signHistory.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Recent Signatures
            </span>
            <button
              onClick={() => setSignHistory([])}
              className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {signHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-default"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold text-indigo-600">
                      {item.algo}
                    </span>
                    <span className="text-xs text-gray-500 truncate max-w-[200px]">
                      msg: {item.msgPreview}
                    </span>
                    <span className="text-xs text-gray-400">
                      key: {item.keyPreview} · {item.at}
                    </span>
                  </div>
                  <code className="text-xs font-mono text-gray-500 break-all">
                    {item.hmac}
                  </code>
                </div>
                <CopyButton text={item.hmac} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// VERIFY SECTION
// ============================================================

function VerifySection() {
  const [message,   setMessage]   = useState("");
  const [secret,    setSecret]    = useState("");
  const [expected,  setExpected]  = useState("");
  const [algorithm, setAlgorithm] = useState("SHA-256");
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [showKey,   setShowKey]   = useState(false);

  async function handleVerify() {
    if (!message.trim()) {
      setError("Please enter the message to verify.");
      setResult(null);
      return;
    }

    if (!secret.trim()) {
      setError("Please enter the secret key.");
      setResult(null);
      return;
    }

    const cleanExpected = expected.trim().toLowerCase();

    if (!cleanExpected) {
      setError("Please enter the expected HMAC signature.");
      setResult(null);
      return;
    }

    const algo = SUPPORTED_ALGORITHMS[algorithm];
    if (cleanExpected.length !== algo.hex || !/^[a-f0-9]+$/.test(cleanExpected)) {
      setError(
        `Invalid ${algorithm} HMAC format. Expected exactly ${algo.hex} hexadecimal characters, got ${cleanExpected.length}.`
      );
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Compute and compare using constant-time via Web Crypto verify
      const computed = await computeHmac(message, secret, algorithm);
      const matches  = computed.hex === cleanExpected;

      // Also try Web Crypto native verify for constant-time comparison
      let nativeVerify = false;
      try {
        nativeVerify = await verifyHmac(message, secret, algorithm, cleanExpected);
      } catch {
        nativeVerify = matches; // fallback
      }

      setResult({
        matches:      matches && nativeVerify,
        computed:     computed.hex,
        expected:     cleanExpected,
        algorithm,
      });
    } catch (e) {
      setError(e.message || "HMAC verification failed.");
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
  }, [message, secret, expected, algorithm]);

  const expectedLen = expected.trim().length;
  const expectedAlgo = SUPPORTED_ALGORITHMS[algorithm];
  const expectedValid = expectedLen === 0 || (
    expectedLen <= expectedAlgo.hex &&
    /^[a-f0-9]*$/.test(expected.trim().toLowerCase())
  );

  return (
    <div className="space-y-4">

      {/* Algorithm */}
      <AlgorithmSelector value={algorithm} onChange={setAlgorithm} />

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verify HMAC
            </>
          )}
        </button>

        <Toggle
          checked={showKey}
          onChange={setShowKey}
          label="Show key"
          description="Toggle secret key visibility"
        />

        <button
          onClick={() => {
            setMessage("Hello, World!");
            setSecret("my-secret-key");
            setExpected("");
            setResult(null);
            setError(null);
          }}
          className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 cursor-pointer transition-colors ml-auto"
        >
          Load sample
        </button>
      </div>

      {/* Three inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Message */}
        <div className="flex flex-col">
          <PanelHeader
            label="Message"
            meta={message ? `${message.length.toLocaleString()} chars` : null}
            actions={
              message && (
                <button
                  onClick={() => { setMessage(""); setResult(null); if (error) setError(null); }}
                  className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )
            }
          />
          <textarea
            value={message}
            onChange={(e) => { setMessage(e.target.value); setResult(null); if (error) setError(null); }}
            placeholder="Enter the original message..."
            spellCheck={false}
            autoCorrect="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[120px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
          />
        </div>

        {/* Secret key */}
        <div className="flex flex-col">
          <PanelHeader
            label="Secret Key"
            meta={secret ? `${new TextEncoder().encode(secret).length} bytes` : "Keep this secret!"}
            actions={
              <div className="flex items-center gap-1.5">
                <Toggle
                  checked={showKey}
                  onChange={setShowKey}
                  label="Show"
                />
                {secret && (
                  <button
                    onClick={() => { setSecret(""); setResult(null); if (error) setError(null); }}
                    className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            }
          />
          {showKey ? (
            <textarea
              value={secret}
              onChange={(e) => { setSecret(e.target.value); setResult(null); if (error) setError(null); }}
              placeholder="Enter the shared secret key..."
              spellCheck={false}
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[120px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
            />
          ) : (
            <input
              type="password"
              value={secret}
              onChange={(e) => { setSecret(e.target.value); setResult(null); if (error) setError(null); }}
              placeholder="Enter the shared secret key..."
              spellCheck={false}
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none min-h-[120px] focus:border-blue-400 transition-colors placeholder:text-gray-300"
            />
          )}
        </div>
      </div>

      {/* Expected HMAC */}
      <div className="flex flex-col">
        <PanelHeader
          label={`Expected HMAC-${algorithm} Signature`}
          meta={
            expectedLen > 0
              ? expectedValid
                ? expectedLen === expectedAlgo.hex
                  ? `✓ Valid ${expectedAlgo.hex}-char hex`
                  : `${expectedLen}/${expectedAlgo.hex} chars`
                : "✗ Invalid hex characters"
              : `${expectedAlgo.hex} hex chars required`
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
        <input
          type="text"
          value={expected}
          onChange={(e) => { setExpected(e.target.value); setResult(null); if (error) setError(null); }}
          placeholder={`Paste expected ${algorithm} HMAC signature (${expectedAlgo.hex} hex chars)...`}
          spellCheck={false}
          autoCorrect="off"
          className={`w-full px-4 py-3.5 text-sm font-mono bg-white border border-t-0 rounded-b-xl outline-none focus:border-blue-400 transition-colors placeholder:text-gray-300 ${
            expectedLen > 0 && !expectedValid
              ? "border-red-200 focus:border-red-400"
              : expectedLen === expectedAlgo.hex
              ? "border-green-200 focus:border-green-400"
              : "border-gray-200"
          }`}
        />
      </div>

      {/* Loading */}
      {loading && <LoadingBar message={`Verifying HMAC-${algorithm}...`} />}

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Result */}
      {result && !loading && (
        <div className={`border-2 rounded-xl overflow-hidden ${
          result.matches ? "border-green-300" : "border-red-300"
        }`}>
          {/* Status */}
          <div className={`flex items-center gap-3 px-5 py-4 ${
            result.matches ? "bg-green-50" : "bg-red-50"
          }`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              result.matches ? "bg-green-100" : "bg-red-100"
            }`}>
              {result.matches ? (
                <svg width="24" height="24" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg width="24" height="24" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <p className={`text-base font-bold ${result.matches ? "text-green-800" : "text-red-800"}`}>
                {result.matches
                  ? "✓ Signature Valid — Message Authenticated"
                  : "✗ Signature Invalid — Authentication Failed"}
              </p>
              <p className={`text-xs mt-0.5 ${result.matches ? "text-green-600" : "text-red-600"}`}>
                {result.matches
                  ? "The HMAC signature matches. Message integrity and authenticity confirmed."
                  : "The HMAC signature does not match. Message may be tampered or the key is wrong."}
              </p>
            </div>
          </div>

          {/* Hash comparison */}
          <div className="divide-y divide-gray-100 bg-white">
            {[
              { label: "Computed",  value: result.computed  },
              { label: "Expected",  value: result.expected  },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3 px-5 py-3">
                <span className="text-xs font-bold text-gray-400 w-20 flex-shrink-0 uppercase tracking-wider pt-0.5">
                  {label}:
                </span>
                <code className={`text-xs font-mono font-bold flex-1 break-all leading-relaxed tracking-wide ${
                  result.matches
                    ? "text-green-700"
                    : label === "Computed"
                    ? "text-red-700"
                    : "text-gray-700"
                }`}>
                  {value}
                </code>
                <CopyButton text={value} />
              </div>
            ))}
          </div>

          {/* Diff on mismatch */}
          {!result.matches && result.computed.length === result.expected.length && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                Diff ({result.computed.split("").filter((c, i) => c !== result.expected[i]).length} chars differ):
              </p>
              <div className="flex flex-wrap gap-0.5 font-mono text-xs">
                {result.computed.split("").map((char, i) => (
                  <span
                    key={i}
                    title={`pos ${i}: got="${char}", expected="${result.expected[i]}"`}
                    className={`px-0.5 rounded cursor-default ${
                      char === result.expected[i]
                        ? "text-gray-400"
                        : "bg-red-100 text-red-700 font-bold ring-1 ring-red-300"
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
// COMPARE SECTION — sign same message with different algorithms
// ============================================================

function CompareSection() {
  const [message,  setMessage]  = useState("");
  const [secret,   setSecret]   = useState("");
  const [results,  setResults]  = useState(null);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [showKey,  setShowKey]  = useState(false);

  const handleCompare = useCallback(async () => {
    if (!message.trim() || !secret.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const computed = await Promise.all(
        ALGORITHM_OPTIONS.map(async (algo) => {
          const res = await computeHmac(message, secret, algo.value);
          return { algo: algo.value, label: algo.label, ...res, color: algo.color };
        })
      );
      setResults(computed);
    } catch (e) {
      setError(e.message || "Comparison failed.");
    } finally {
      setLoading(false);
    }
  }, [message, secret]);

  useEffect(() => {
    if (!message.trim() || !secret.trim()) return;
    const t = setTimeout(handleCompare, 400);
    return () => clearTimeout(t);
  }, [message, secret, handleCompare]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleCompare();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCompare]);

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
              Computing all...
            </>
          ) : (
            <>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compare All Algorithms
            </>
          )}
        </button>

        <Toggle
          checked={showKey}
          onChange={setShowKey}
          label="Show key"
          description="Toggle key visibility"
        />

        <p className="text-xs text-gray-400">
          Signs the same message with all 4 HMAC algorithms simultaneously
        </p>

        <button
          onClick={() => {
            setMessage("Hello, World!");
            setSecret("test-secret-key-32-bytes-minimum!");
            setResults(null);
            setError(null);
          }}
          className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 cursor-pointer transition-colors ml-auto"
        >
          Load sample
        </button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Message */}
        <div className="flex flex-col">
          <PanelHeader
            label="Message"
            meta={message ? `${message.length.toLocaleString()} chars` : null}
            actions={
              message && (
                <button
                  onClick={() => { setMessage(""); setResults(null); if (error) setError(null); }}
                  className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )
            }
          />
          <textarea
            value={message}
            onChange={(e) => { setMessage(e.target.value); if (error) setError(null); }}
            placeholder="Enter message to sign with all algorithms..."
            spellCheck={false}
            autoCorrect="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[120px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
          />
        </div>

        {/* Secret */}
        <div className="flex flex-col">
          <PanelHeader
            label="Secret Key"
            meta={secret ? `${new TextEncoder().encode(secret).length} bytes` : null}
            actions={
              secret && (
                <button
                  onClick={() => { setSecret(""); setResults(null); if (error) setError(null); }}
                  className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )
            }
          />
          {showKey ? (
            <textarea
              value={secret}
              onChange={(e) => { setSecret(e.target.value); if (error) setError(null); }}
              placeholder="Enter secret key..."
              spellCheck={false}
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[120px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
            />
          ) : (
            <input
              type="password"
              value={secret}
              onChange={(e) => { setSecret(e.target.value); if (error) setError(null); }}
              placeholder="Enter secret key (hidden)..."
              spellCheck={false}
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none min-h-[120px] focus:border-blue-400 transition-colors placeholder:text-gray-300"
            />
          )}
        </div>
      </div>

      {/* Key strength */}
      {secret && <KeyStrengthIndicator secret={secret} />}

      {/* Loading */}
      {loading && <LoadingBar message="Computing HMAC with all 4 algorithms..." />}

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Results */}
      {results && !loading && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Algorithm Comparison — Same Message + Key
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {results.map((item) => (
              <div key={item.algo} className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-default">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${item.color}`}>
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {SUPPORTED_ALGORITHMS[item.algo].bits}-bit · {item.hex.length} chars
                    </span>
                  </div>
                  <CopyButton text={item.hex} />
                </div>
                <code className="text-xs font-mono text-gray-700 break-all leading-relaxed">
                  {item.hex}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-14 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-4">
          <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
            🔀
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-500">
              Enter a message and key to compare all algorithms
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Signs with SHA-1, SHA-256, SHA-384, and SHA-512 simultaneously
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// USE CASES SECTION
// ============================================================

function UseCasesSection() {
  const [activeCase, setActiveCase]   = useState(0);
  const [result,     setResult]       = useState(null);
  const [loading,    setLoading]      = useState(false);
  const [error,      setError]        = useState(null);
  const [outputFmt,  setOutputFmt]    = useState("hex");

  const current = USE_CASES[activeCase];

  async function handleTry() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await computeHmac(current.message, current.secret, current.algo);
      setResult(res);
    } catch (e) {
      setError(e.message || "Computation failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [activeCase]);

  return (
    <div className="space-y-4">

      {/* Use case cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {USE_CASES.map((uc, i) => (
          <button
            key={uc.name}
            onClick={() => setActiveCase(i)}
            className={`flex items-start gap-3 p-4 rounded-xl border text-left cursor-pointer transition-all ${
              activeCase === i
                ? "border-blue-300 bg-blue-50 shadow-sm ring-1 ring-blue-200"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="flex flex-col">
              <p className={`text-sm font-semibold ${activeCase === i ? "text-blue-800" : "text-gray-700"}`}>
                {uc.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                {uc.desc}
              </p>
              <span className={`inline-block mt-1.5 text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                activeCase === i ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
              }`}>
                HMAC-{uc.algo}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Active use case detail */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-bold text-gray-700">{current.name}</span>
          <button
            onClick={handleTry}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all shadow-sm"
          >
            {loading ? (
              <>
                <svg width="12" height="12" className="animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Computing...
              </>
            ) : (
              <>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Try it
              </>
            )}
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Message */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Message
            </p>
            <pre className="text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 overflow-x-auto whitespace-pre-wrap break-all">
              {current.message}
            </pre>
          </div>

          {/* Key */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Secret Key
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex-1 break-all">
                {current.secret}
              </code>
              <CopyButton text={current.secret} label="Copy key" />
            </div>
          </div>

          {/* Algorithm */}
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Algorithm:</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${getAlgorithmOption(current.algo).color}`}>
              HMAC-{current.algo}
            </span>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && <LoadingBar message={`Computing ${current.name} signature...`} />}

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Result */}
      {result && !loading && (
        <HmacOutputCard
          result={result}
          algorithm={current.algo}
          outputFormat={outputFmt}
          onFormatChange={setOutputFmt}
        />
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function HmacGenerator() {
  const [activeTab, setActiveTab] = useState("generate");

  return (
    <div className="space-y-5">

      {/* HMAC info banner */}
      <HmacInfoBanner />

      {/* Section tabs */}
      <SectionTabs active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === "generate" && <GenerateSection />}
      {activeTab === "verify"   && <VerifySection />}
      {activeTab === "compare"  && <CompareSection />}
      {activeTab === "usecases" && <UseCasesSection />}
    </div>
  );
}