"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// BCRYPT IMPLEMENTATION
// Uses bcryptjs library (imported dynamically to avoid SSR issues)
// Falls back to a clear error if library unavailable
// ============================================================

async function loadBcrypt() {
  try {
    const bcrypt = await import("bcryptjs");
    return bcrypt.default || bcrypt;
  } catch {
    throw new Error(
      "bcryptjs library not found. Run: npm install bcryptjs"
    );
  }
}

async function hashPassword(password, saltRounds) {
  const bcrypt = await loadBcrypt();
  const salt   = await bcrypt.genSalt(saltRounds);
  const hash   = await bcrypt.hash(password, salt);
  return { hash, salt };
}

async function verifyPassword(password, hash) {
  const bcrypt = await loadBcrypt();
  return bcrypt.compare(password, hash);
}

// ============================================================
// CONSTANTS
// ============================================================

const SALT_ROUND_OPTIONS = [4, 6, 8, 10, 11, 12, 13, 14];

const SALT_ROUND_INFO = {
  4:  { label: "4",  time: "~1ms",    strength: "Testing only",    color: "text-red-600 bg-red-50 border-red-200"       },
  6:  { label: "6",  time: "~5ms",    strength: "Minimal",         color: "text-orange-600 bg-orange-50 border-orange-200" },
  8:  { label: "8",  time: "~50ms",   strength: "Low",             color: "text-amber-600 bg-amber-50 border-amber-200"  },
  10: { label: "10", time: "~100ms",  strength: "Recommended",     color: "text-green-600 bg-green-50 border-green-200"  },
  11: { label: "11", time: "~200ms",  strength: "Good",            color: "text-green-700 bg-green-50 border-green-200"  },
  12: { label: "12", time: "~400ms",  strength: "Strong",          color: "text-blue-600 bg-blue-50 border-blue-200"     },
  13: { label: "13", time: "~800ms",  strength: "Very strong",     color: "text-indigo-600 bg-indigo-50 border-indigo-200"},
  14: { label: "14", time: "~1.5s",   strength: "Maximum",         color: "text-purple-600 bg-purple-50 border-purple-200"},
};

const SAMPLE_PASSWORDS = [
  { label: "Weak",     value: "password",         strength: 0 },
  { label: "Medium",   value: "P@ssw0rd",          strength: 1 },
  { label: "Strong",   value: "Tr0ub4dor&3",       strength: 2 },
  { label: "Very strong", value: "c0rrect-h0rse-b4ttery-st4ple!", strength: 3 },
];

// ============================================================
// PASSWORD STRENGTH CHECKER
// ============================================================

function checkPasswordStrength(password) {
  if (!password) return { score: 0, label: "None", color: "bg-gray-200", checks: [] };

  const checks = [
    { id: "length8",    label: "At least 8 characters",  pass: password.length >= 8          },
    { id: "length12",   label: "At least 12 characters", pass: password.length >= 12         },
    { id: "uppercase",  label: "Uppercase letter",        pass: /[A-Z]/.test(password)        },
    { id: "lowercase",  label: "Lowercase letter",        pass: /[a-z]/.test(password)        },
    { id: "number",     label: "Number",                  pass: /[0-9]/.test(password)        },
    { id: "special",    label: "Special character",       pass: /[^A-Za-z0-9]/.test(password) },
    { id: "length20",   label: "At least 20 characters", pass: password.length >= 20         },
  ];

  const score = checks.filter((c) => c.pass).length;

  const levels = [
    { min: 0, max: 1, label: "Very weak",   color: "bg-red-500",    text: "text-red-600"    },
    { min: 2, max: 2, label: "Weak",        color: "bg-orange-500", text: "text-orange-600" },
    { min: 3, max: 3, label: "Fair",        color: "bg-amber-500",  text: "text-amber-600"  },
    { min: 4, max: 4, label: "Good",        color: "bg-yellow-500", text: "text-yellow-600" },
    { min: 5, max: 5, label: "Strong",      color: "bg-lime-500",   text: "text-lime-600"   },
    { min: 6, max: 6, label: "Very strong", color: "bg-green-500",  text: "text-green-600"  },
    { min: 7, max: 7, label: "Excellent",   color: "bg-emerald-500",text: "text-emerald-600"},
  ];

  const level = levels.find((l) => score >= l.min && score <= l.max) || levels[0];

  // Entropy estimation
  let charsetSize = 0;
  if (/[a-z]/.test(password))      charsetSize += 26;
  if (/[A-Z]/.test(password))      charsetSize += 26;
  if (/[0-9]/.test(password))      charsetSize += 10;
  if (/[^A-Za-z0-9]/.test(password)) charsetSize += 32;
  const entropy = charsetSize > 0
    ? Math.round(password.length * Math.log2(charsetSize))
    : 0;

  return {
    score,
    maxScore: checks.length,
    label:    level.label,
    color:    level.color,
    text:     level.text,
    checks,
    entropy,
  };
}

// ============================================================
// BCRYPT HASH PARSER
// ============================================================

function parseBcryptHash(hash) {
  if (!hash || !hash.startsWith("$2")) return null;

  const parts = hash.match(/^\$(\w+)\$(\d+)\$(.{22})(.+)$/);
  if (!parts) return null;

  const [, version, cost, salt, checksum] = parts;

  return {
    valid:    true,
    version:  `$${version}$`,
    cost:     parseInt(cost),
    salt:     `$${version}$${cost}$${salt}`,
    checksum,
    full:     hash,
    info: SALT_ROUND_INFO[parseInt(cost)] || {
      label: cost,
      time: "unknown",
      strength: "Unknown",
      color: "text-gray-600 bg-gray-50 border-gray-200",
    },
  };
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Section tabs ──────────────────────────────────────────────
function SectionTabs({ active, onChange }) {
  const tabs = [
    { value: "hash",    label: "Hash" },
    { value: "verify",  label: "Verify" },
    { value: "inspect", label: "Inspect" },
    { value: "batch",   label: "Batch" },
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
function LoadingBar({ message = "Computing bcrypt hash..." }) {
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
      <span className="text-xs text-blue-400 ml-auto">
        Higher cost rounds take longer — this is intentional
      </span>
    </div>
  );
}

// ── Security banner ───────────────────────────────────────────
function SecurityBanner() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
      <svg
        width="16"
        height="16"
        className="flex-shrink-0 mt-0.5 text-green-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      <div>
        <p className="text-xs font-bold text-green-800">
          bcrypt — Industry Standard for Password Hashing
        </p>
        <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
          bcrypt is specifically designed for password hashing. It uses an adaptive cost factor
          to remain resistant to brute-force attacks as hardware gets faster. Unlike MD5/SHA, bcrypt
          is <strong>intentionally slow</strong>. Use cost 10–12 in production. Never use MD5 or
          SHA for password storage.
        </p>
      </div>
    </div>
  );
}

// ── Password strength meter ───────────────────────────────────
function PasswordStrengthMeter({ password }) {
  if (!password) return null;

  const strength = checkPasswordStrength(password);
  const pct      = Math.round((strength.score / strength.maxScore) * 100);

  return (
    <div className="space-y-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500">Password Strength</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${strength.text}`}>
              {strength.label}
            </span>
            <span className="text-xs text-gray-400">
              Entropy: ~{strength.entropy} bits
            </span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Checks */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
        {strength.checks.map(({ id, label, pass }) => (
          <div
            key={id}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
              pass
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-gray-50 border-gray-200 text-gray-400"
            }`}
          >
            <svg
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className={pass ? "text-green-600" : "text-gray-300"}
            >
              {pass ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
            <span className="font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cost selector ─────────────────────────────────────────────
function CostSelector({ value, onChange }) {
  const info = SALT_ROUND_INFO[value];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
          Cost factor:
        </span>
        <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg flex-wrap">
          {SALT_ROUND_OPTIONS.map((rounds) => {
            const ri = SALT_ROUND_INFO[rounds];
            return (
              <button
                key={rounds}
                onClick={() => onChange(rounds)}
                title={`${ri.strength} · ~${ri.time}`}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  value === rounds
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {rounds}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current cost info */}
      {info && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${info.color}`}>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold">{info.strength}</span>
          <span>·</span>
          <span>~{info.time} per hash</span>
          <span>·</span>
          <span>2^{value} iterations</span>
          {value === 10 && (
            <span className="ml-1 px-1.5 py-0.5 bg-green-600 text-white rounded-md text-xs font-bold">
              Recommended
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Hash output card ──────────────────────────────────────────
function HashOutputCard({ hash }) {
  if (!hash) return null;

  const parsed = parseBcryptHash(hash);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            bcrypt Hash
          </span>
          <span className="text-xs text-gray-400">60 characters</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CopyButton text={hash} />
        </div>
      </div>

      {/* Hash value */}
      <div className="px-4 py-4 bg-white space-y-3">
        <code className="block text-sm font-mono font-bold text-gray-900 break-all leading-relaxed">
          {hash}
        </code>

        {/* Parsed breakdown */}
        {parsed && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Hash breakdown:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  label: "Algorithm version",
                  value: parsed.version,
                  color: "bg-blue-50 border-blue-200 text-blue-700",
                },
                {
                  label: "Cost factor (rounds)",
                  value: `${parsed.cost} (2^${parsed.cost} = ${Math.pow(2, parsed.cost).toLocaleString()} iterations)`,
                  color: "bg-purple-50 border-purple-200 text-purple-700",
                },
                {
                  label: "Salt (22 chars)",
                  value: `$${parsed.version.slice(1, 4)}${parsed.cost.toString().padStart(2, "0")}$${hash.slice(7, 29)}`,
                  color: "bg-amber-50 border-amber-200 text-amber-700",
                },
                {
                  label: "Checksum (31 chars)",
                  value: hash.slice(29),
                  color: "bg-green-50 border-green-200 text-green-700",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className={`px-3 py-2 rounded-xl border ${color}`}
                >
                  <p className="text-xs font-medium opacity-70 mb-0.5">{label}</p>
                  <code className="text-xs font-mono font-bold break-all">
                    {value}
                  </code>
                </div>
              ))}
            </div>

            {/* Cost info badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${parsed.info.color}`}>
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-bold">Cost {parsed.cost}</span>
              <span>·</span>
              <span>{parsed.info.strength}</span>
              <span>·</span>
              <span>~{parsed.info.time} to verify</span>
            </div>

            {/* Important note */}
            <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
              <svg width="13" height="13" className="flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                Each hash is <strong>unique</strong> even for the same password — bcrypt generates a random salt automatically.
                Store this entire 60-character string in your database.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// HASH SECTION
// ============================================================

function HashSection() {
  const [password,    setPassword]    = useState("");
  const [hash,        setHash]        = useState("");
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [saltRounds,  setSaltRounds]  = useState(10);
  const [showPass,    setShowPass]    = useState(false);
  const [elapsed,     setElapsed]     = useState(null);
  const [hashHistory, setHashHistory] = useState([]);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  async function handleHash() {
    if (!password) {
      setError("Please enter a password to hash.");
      setHash("");
      return;
    }

    if (password.length > 72) {
      setError("bcrypt truncates passwords at 72 bytes. Your password exceeds this limit. Consider pre-hashing with SHA-256 first.");
      return;
    }

    // Cancel previous operation
    const token = Symbol("bcrypt-token");
    abortRef.current = token;

    setLoading(true);
    setError(null);
    setHash("");
    setElapsed(null);

    const start = performance.now();

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed(((performance.now() - start) / 1000).toFixed(1));
    }, 100);

    try {
      const { hash: result } = await hashPassword(password, saltRounds);
      if (abortRef.current !== token) return;

      const ms = performance.now() - start;
      setHash(result);
      setElapsed((ms / 1000).toFixed(2));

      // Add to history
      setHashHistory((prev) => [
        {
          id:       Date.now(),
          preview:  password.slice(0, 3) + "***",
          hash:     result,
          rounds:   saltRounds,
          time:     (ms / 1000).toFixed(2),
          at:       new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 4),
      ]);
    } catch (e) {
      if (abortRef.current !== token) return;
      setHash("");
      setError(e.message || "Failed to hash password.");
    } finally {
      clearInterval(timerRef.current);
      if (abortRef.current === token) setLoading(false);
    }
  }

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleHash();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [password, saltRounds]);

  return (
    <div className="space-y-4">

      {/* Cost selector */}
      <CostSelector value={saltRounds} onChange={setSaltRounds} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleHash}
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
              Hashing... {elapsed && `${elapsed}s`}
            </>
          ) : (
            <>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Hash Password
            </>
          )}
        </button>

        <Toggle
          checked={showPass}
          onChange={setShowPass}
          label="Show password"
          description="Toggle password visibility"
        />

        {/* Sample passwords */}
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {SAMPLE_PASSWORDS.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setPassword(s.value);
                setHash("");
                setError(null);
                setElapsed(null);
              }}
              className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 cursor-pointer transition-colors whitespace-nowrap"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Password input */}
      <div className="flex flex-col">
        <PanelHeader
          label="Password"
          meta={
            password
              ? `${password.length} chars${password.length > 72 ? " — ⚠ Exceeds 72-byte bcrypt limit" : ""}`
              : "Max 72 bytes (bcrypt limit)"
          }
          actions={
            password && (
              <button
                onClick={() => { setPassword(""); setHash(""); setError(null); setElapsed(null); }}
                className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                Clear
              </button>
            )
          }
        />
        {showPass ? (
          <textarea
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(null); setHash(""); }}
            placeholder={"Enter password to hash...\n\nBest practices:\n• Use 12+ characters\n• Mix uppercase, lowercase, numbers, symbols\n• Avoid common words and patterns\n• Use a password manager"}
            spellCheck={false}
            autoComplete="new-password"
            className={`w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none resize-none min-h-[120px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs ${
              password.length > 72
                ? "border-amber-300 focus:border-amber-400"
                : "border-gray-200"
            }`}
          />
        ) : (
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(null); setHash(""); }}
            placeholder="Enter password to hash..."
            spellCheck={false}
            autoComplete="new-password"
            className={`w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none focus:border-blue-400 transition-colors placeholder:text-gray-300 ${
              password.length > 72
                ? "border-amber-300 focus:border-amber-400"
                : "border-gray-200"
            }`}
          />
        )}
      </div>

      {/* Password strength meter */}
      {password && <PasswordStrengthMeter password={password} />}

      {/* 72-byte warning */}
      {password.length > 72 && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-amber-700">
            <strong>72-byte limit:</strong> bcrypt silently truncates passwords longer than 72 bytes.
            Characters beyond position 72 are ignored. Consider SHA-256 pre-hashing for longer passphrases.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingBar message={`Computing bcrypt (cost ${saltRounds})... ${elapsed ? elapsed + "s" : ""}`} />}

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Hash output */}
      {hash && !loading && (
        <>
          <HashOutputCard hash={hash} />

          {/* Elapsed time */}
          {elapsed && (
            <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Computed in {elapsed}s with cost factor {saltRounds} (2^{saltRounds} = {Math.pow(2, saltRounds).toLocaleString()} iterations)
            </div>
          )}
        </>
      )}

      {/* Hash history */}
      {hashHistory.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Recent Hashes (this session)
            </span>
            <button
              onClick={() => setHashHistory([])}
              className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Clear history
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {hashHistory.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-gray-600">
                      {item.preview}
                    </span>
                    <span className="text-xs text-gray-400">
                      cost {item.rounds} · {item.time}s · {item.at}
                    </span>
                  </div>
                  <code className="text-xs font-mono text-gray-500 break-all">
                    {item.hash}
                  </code>
                </div>
                <CopyButton text={item.hash} />
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
  const [password, setPassword] = useState("");
  const [hash,     setHash]     = useState("");
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [elapsed,  setElapsed]  = useState(null);

  async function handleVerify() {
    if (!password) {
      setError("Please enter the password to verify.");
      setResult(null);
      return;
    }

    const trimmedHash = hash.trim();

    if (!trimmedHash) {
      setError("Please enter the bcrypt hash to verify against.");
      setResult(null);
      return;
    }

    // Validate bcrypt hash format
    if (!trimmedHash.match(/^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/)) {
      setError(
        "Invalid bcrypt hash format. A valid bcrypt hash starts with $2a$, $2b$, or $2y$ followed by the cost factor and 53 characters."
      );
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setElapsed(null);

    const start = performance.now();

    try {
      const matches = await verifyPassword(password, trimmedHash);
      const ms      = performance.now() - start;
      setElapsed((ms / 1000).toFixed(2));
      setResult({ matches, elapsed: (ms / 1000).toFixed(2) });
    } catch (e) {
      setError(e.message || "Verification failed. The hash may be malformed.");
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
  }, [password, hash]);

  const hashInfo  = parseBcryptHash(hash.trim());
  const hashValid = !!hashInfo;

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verify Password
            </>
          )}
        </button>

        <Toggle
          checked={showPass}
          onChange={setShowPass}
          label="Show password"
          description="Toggle password visibility"
        />

        {/* Sample */}
        <button
          onClick={() => {
            setPassword("P@ssw0rd");
            setHash("$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
            setResult(null);
            setError(null);
            setElapsed(null);
          }}
          className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 cursor-pointer transition-colors ml-auto"
        >
          Load sample
        </button>
      </div>

      {/* Two inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Password */}
        <div className="flex flex-col">
          <PanelHeader
            label="Password to verify"
            meta={password ? `${password.length} chars` : null}
            actions={
              password && (
                <button
                  onClick={() => { setPassword(""); setResult(null); if (error) setError(null); }}
                  className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )
            }
          />
          {showPass ? (
            <textarea
              value={password}
              onChange={(e) => { setPassword(e.target.value); setResult(null); if (error) setError(null); }}
              placeholder="Enter the plain-text password..."
              spellCheck={false}
              autoComplete="off"
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
            />
          ) : (
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setResult(null); if (error) setError(null); }}
              placeholder="Enter the plain-text password..."
              spellCheck={false}
              autoComplete="off"
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300"
            />
          )}
        </div>

        {/* Hash */}
        <div className="flex flex-col">
          <PanelHeader
            label="bcrypt Hash"
            meta={
              hash.trim()
                ? hashValid
                  ? `✓ Valid format · Cost ${hashInfo?.cost}`
                  : "✗ Invalid bcrypt format"
                : "Paste the stored hash"
            }
            actions={
              hash && (
                <button
                  onClick={() => { setHash(""); setResult(null); if (error) setError(null); }}
                  className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )
            }
          />
          <textarea
            value={hash}
            onChange={(e) => { setHash(e.target.value); setResult(null); if (error) setError(null); }}
            placeholder={"Paste the bcrypt hash...\n\nValid format:\n$2a$10$N9qo8uLOickgx2ZMRZoMye..."}
            spellCheck={false}
            autoCorrect="off"
            className={`flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none resize-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs ${
              hash.trim() && !hashValid
                ? "border-red-200 focus:border-red-400"
                : hash.trim() && hashValid
                ? "border-green-200 focus:border-green-400"
                : "border-gray-200"
            }`}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <LoadingBar
          message={`Verifying against cost ${hashInfo?.cost ?? "?"} hash...`}
        />
      )}

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
              <p className={`text-lg font-bold ${result.matches ? "text-green-800" : "text-red-800"}`}>
                {result.matches
                  ? "✓ Password Matches"
                  : "✗ Password Does Not Match"}
              </p>
              <p className={`text-xs mt-0.5 ${result.matches ? "text-green-600" : "text-red-600"}`}>
                {result.matches
                  ? `The password is correct. Verified in ${result.elapsed}s.`
                  : `The password is incorrect. Verified in ${result.elapsed}s.`}
              </p>
            </div>
          </div>

          {/* Meta */}
          {hashInfo && (
            <div className="px-5 py-3 bg-white border-t border-gray-100">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Hash version:</span>
                  <span className="font-mono font-semibold text-gray-700">{hashInfo.version}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Cost factor:</span>
                  <span className="font-mono font-semibold text-gray-700">{hashInfo.cost}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Security:</span>
                  <span className={`font-semibold ${SALT_ROUND_INFO[hashInfo.cost]?.color?.split(" ")[0] || "text-gray-700"}`}>
                    {hashInfo.info.strength}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Verification time:</span>
                  <span className="font-mono font-semibold text-gray-700">{result.elapsed}s</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// INSPECT SECTION
// ============================================================

function InspectSection() {
  const [hash,  setHash]  = useState("");
  const [error, setError] = useState(null);

  const parsed = hash.trim() ? parseBcryptHash(hash.trim()) : null;
  const isInvalid = hash.trim() && !parsed;

  return (
    <div className="space-y-4">

      {/* Input */}
      <div className="flex flex-col">
        <PanelHeader
          label="bcrypt Hash to Inspect"
          meta={
            hash.trim()
              ? parsed
                ? "✓ Valid bcrypt hash"
                : "✗ Invalid format"
              : null
          }
          actions={
            hash && (
              <button
                onClick={() => { setHash(""); setError(null); }}
                className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                Clear
              </button>
            )
          }
        />
        <textarea
          value={hash}
          onChange={(e) => { setHash(e.target.value); setError(null); }}
          placeholder={"Paste any bcrypt hash to inspect its structure...\n\nExample:\n$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy\n\nWill extract: version, cost, salt, checksum"}
          spellCheck={false}
          autoCorrect="off"
          className={`w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none resize-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs ${
            isInvalid
              ? "border-red-200 focus:border-red-400"
              : parsed
              ? "border-green-200 focus:border-green-400"
              : "border-gray-200"
          }`}
        />
      </div>

      {/* Invalid notice */}
      {isInvalid && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-xs font-bold text-red-700">Not a valid bcrypt hash</p>
            <p className="text-xs text-red-600 mt-0.5">
              Expected format: <code className="font-mono">$2b$10$[22-char-salt][31-char-checksum]</code>
              <br />
              Total length must be exactly 60 characters.
            </p>
          </div>
        </div>
      )}

      {/* Parsed result */}
      {parsed && (
        <div className="space-y-3">

          {/* Visual breakdown */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Hash Structure Breakdown
              </span>
            </div>

            {/* Color-coded hash */}
            <div className="px-4 py-4 bg-white space-y-3">
              <div className="text-sm font-mono font-bold break-all leading-relaxed">
                <span className="text-blue-600">{hash.slice(0, 4)}</span>
                <span className="text-purple-600">{hash.slice(4, 7)}</span>
                <span className="text-amber-600">{hash.slice(7, 29)}</span>
                <span className="text-green-600">{hash.slice(29)}</span>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Algorithm",  color: "bg-blue-100 text-blue-700 border-blue-200",    example: hash.slice(0, 4)  },
                  { label: "Cost",       color: "bg-purple-100 text-purple-700 border-purple-200",example: hash.slice(4, 7) },
                  { label: "Salt",       color: "bg-amber-100 text-amber-700 border-amber-200",  example: "22 chars"       },
                  { label: "Checksum",   color: "bg-green-100 text-green-700 border-green-200",  example: "31 chars"       },
                ].map(({ label, color, example }) => (
                  <div key={label} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${color}`}>
                    <span>{label}:</span>
                    <code className="font-mono">{example}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label:   "Version",
                value:   parsed.version,
                detail:  parsed.version === "$2b$" ? "Recommended (PHP 5.3.7+)" : parsed.version === "$2a$" ? "Original (legacy)" : "Alternative",
                color:   "border-blue-200 bg-blue-50",
                valColor:"text-blue-700",
              },
              {
                label:   "Cost factor",
                value:   String(parsed.cost),
                detail:  `${parsed.info.strength} · ~${parsed.info.time} to verify · 2^${parsed.cost} = ${Math.pow(2, parsed.cost).toLocaleString()} iterations`,
                color:   "border-purple-200 bg-purple-50",
                valColor:"text-purple-700",
              },
              {
                label:   "Salt",
                value:   hash.slice(7, 29),
                detail:  "22 chars · 128-bit random salt (unique per hash)",
                color:   "border-amber-200 bg-amber-50",
                valColor:"text-amber-700",
              },
              {
                label:   "Checksum",
                value:   hash.slice(29),
                detail:  "31 chars · 184-bit derived key output",
                color:   "border-green-200 bg-green-50",
                valColor:"text-green-700",
              },
            ].map(({ label, value, detail, color, valColor }) => (
              <div key={label} className={`px-4 py-3 rounded-xl border ${color} space-y-1.5`}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {label}
                </p>
                <div className="flex items-center gap-2">
                  <code className={`text-sm font-mono font-bold break-all flex-1 ${valColor}`}>
                    {value}
                  </code>
                  <CopyButton text={value} />
                </div>
                <p className="text-xs text-gray-500">{detail}</p>
              </div>
            ))}
          </div>

          {/* Security assessment */}
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${parsed.info.color}`}>
            <svg width="15" height="15" className="flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-xs font-bold">
                Security: {parsed.info.strength} (Cost {parsed.cost})
              </p>
              <p className="text-xs mt-0.5 opacity-80">
                {parsed.cost < 10
                  ? "⚠ This hash uses a low cost factor. Consider re-hashing with cost 10–12 for production use."
                  : parsed.cost >= 12
                  ? "✓ Strong cost factor suitable for high-security applications."
                  : "✓ Good cost factor suitable for most production applications."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hash && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-4">
          <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
            🔍
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-500">
              Paste any bcrypt hash to inspect
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Extracts version, cost factor, salt, and checksum
            </p>
          </div>
          <button
            onClick={() => setHash("$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy")}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer"
          >
            Load sample hash
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// BATCH SECTION
// ============================================================

function BatchSection() {
  const [passwords,  setPasswords]  = useState("");
  const [saltRounds, setSaltRounds] = useState(10);
  const [results,    setResults]    = useState([]);
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [progress,   setProgress]   = useState({ current: 0, total: 0 });
  const abortRef = useRef(null);

  async function handleBatch() {
    const lines = passwords
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setError("Please enter one password per line.");
      return;
    }

    if (lines.length > 20) {
      setError("Batch limited to 20 passwords at a time to avoid browser timeout.");
      return;
    }

    const token = Symbol("batch-token");
    abortRef.current = token;

    setLoading(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: lines.length });

    const computed = [];

    for (let i = 0; i < lines.length; i++) {
      if (abortRef.current !== token) break;

      const pw = lines[i];
      setProgress({ current: i + 1, total: lines.length });

      try {
        if (pw.length > 72) {
          computed.push({
            password: pw,
            hash:     null,
            error:    "Exceeds 72-byte bcrypt limit",
            index:    i + 1,
          });
        } else {
          const start      = performance.now();
          const { hash }   = await hashPassword(pw, saltRounds);
          const elapsed    = ((performance.now() - start) / 1000).toFixed(2);
          computed.push({ password: pw, hash, elapsed, index: i + 1 });
        }
      } catch (e) {
        computed.push({
          password: pw,
          hash:     null,
          error:    e.message || "Failed",
          index:    i + 1,
        });
      }
    }

    if (abortRef.current === token) {
      setResults(computed);
      setLoading(false);
    }
  }

  function handleAbort() {
    abortRef.current = null;
    setLoading(false);
  }

  async function handleCopyAll() {
    const text = results
      .filter((r) => r.hash)
      .map((r) => r.hash)
      .join("\n");
    await copyToClipboard(text);
  }

  const successCount = results.filter((r) => r.hash).length;
  const errorCount   = results.filter((r) => r.error).length;

  return (
    <div className="space-y-4">

      {/* Cost + options */}
      <CostSelector value={saltRounds} onChange={setSaltRounds} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleBatch}
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
              {progress.current}/{progress.total} hashed...
            </>
          ) : (
            <>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Hash All Passwords
            </>
          )}
        </button>

        {loading && (
          <button
            onClick={handleAbort}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
          >
            Stop
          </button>
        )}

        {results.length > 0 && !loading && (
          <button
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors ml-auto"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy all hashes ({successCount})
          </button>
        )}
      </div>

      {/* Password input */}
      <div className="flex flex-col">
        <PanelHeader
          label="Passwords (one per line)"
          meta={
            passwords.trim()
              ? `${passwords.trim().split("\n").filter(Boolean).length} passwords · max 20`
              : "One password per line · max 20"
          }
          actions={
            passwords && (
              <button
                onClick={() => { setPasswords(""); setResults([]); setError(null); }}
                className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                Clear
              </button>
            )
          }
        />
        <textarea
          value={passwords}
          onChange={(e) => { setPasswords(e.target.value); if (error) setError(null); }}
          placeholder={"Enter one password per line...\n\npassword123\nP@ssw0rd!\nTr0ub4dor&3\ncorrect-horse-battery-staple\n\nMax 20 passwords per batch"}
          spellCheck={false}
          autoComplete="off"
          className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[180px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
        />
      </div>

      {/* Progress bar */}
      {loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Hashing {progress.current} of {progress.total} passwords...</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Results */}
      {results.length > 0 && !loading && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Results
              </span>
              <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                {successCount} hashed
              </span>
              {errorCount > 0 && (
                <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  {errorCount} failed
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              Cost factor: {saltRounds}
            </span>
          </div>

          {/* Result rows */}
          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {results.map((item) => (
              <div key={item.index} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.hash ? "bg-green-100" : "bg-red-100"
                  }`}>
                    {item.hash ? (
                      <svg width="10" height="10" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Password preview */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-gray-600">
                        #{item.index}
                      </span>
                      <span className="text-xs font-mono text-gray-500 truncate max-w-[120px]" title={item.password}>
                        {item.password.slice(0, 3)}{"*".repeat(Math.min(item.password.length - 3, 8))}
                      </span>
                      {item.elapsed && (
                        <span className="text-xs text-gray-400">· {item.elapsed}s</span>
                      )}
                    </div>

                    {/* Hash or error */}
                    {item.hash ? (
                      <code className="text-xs font-mono text-gray-600 break-all">
                        {item.hash}
                      </code>
                    ) : (
                      <p className="text-xs text-red-500 font-medium">{item.error}</p>
                    )}
                  </div>

                  {item.hash && <CopyButton text={item.hash} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function BcryptGenerator() {
  const [activeTab, setActiveTab] = useState("hash");

  return (
    <div className="space-y-5">

      {/* Security banner */}
      <SecurityBanner />

      {/* Section tabs */}
      <SectionTabs active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === "hash"    && <HashSection />}
      {activeTab === "verify"  && <VerifySection />}
      {activeTab === "inspect" && <InspectSection />}
      {activeTab === "batch"   && <BatchSection />}
    </div>
  );
}