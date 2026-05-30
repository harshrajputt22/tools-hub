"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ShieldCheck, Shield, Lock, TriangleAlert,
  CheckCircle, BarChart3, BookOpen,
  Copy, Check, AlertCircle, Loader2,
  Key, Zap, RefreshCw, Timer, Gauge, Ban,
  ChevronRight, Target, XCircle, Info,
  KeyRound, X,
} from "lucide-react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// HASH IMPLEMENTATIONS
// ============================================================

async function pbkdf2Hash(password, options = {}) {
  const { iterations = 310000, keyLength = 32, hash = "SHA-256", saltBytes = 16 } = options;
  if (!window.crypto?.subtle) throw new Error("Web Crypto API not available.");
  const enc    = new TextEncoder();
  const salt   = window.crypto.getRandomValues(new Uint8Array(saltBytes));
  const keyMat = await window.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits   = await window.crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash }, keyMat, keyLength * 8);
  const hashArr = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `$pbkdf2-${hash.toLowerCase().replace("-", "")}$${iterations}$${saltHex}$${hashArr}`;
}

async function pbkdf2Verify(password, storedHash) {
  const parts = storedHash.match(/^\$pbkdf2-(sha256|sha512)\$(\d+)\$([0-9a-f]+)\$([0-9a-f]+)$/);
  if (!parts) throw new Error("Invalid PBKDF2 hash format.");
  const [, hashName, iterations, saltHex, expectedHex] = parts;
  const hash      = hashName === "sha256" ? "SHA-256" : "SHA-512";
  const keyLength = expectedHex.length / 2;
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g).map((b) => parseInt(b, 16)));
  const enc    = new TextEncoder();
  const keyMat = await window.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits   = await window.crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations: parseInt(iterations), hash }, keyMat, keyLength * 8);
  const computed = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return computed === expectedHex;
}

async function shaHash(password, algorithm = "SHA-256") {
  const enc     = new TextEncoder();
  const hashBuf = await window.crypto.subtle.digest(algorithm, enc.encode(password));
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function bcryptHash(password, rounds = 10) {
  try {
    const bcrypt = await import("bcryptjs");
    const lib    = bcrypt.default || bcrypt;
    const salt   = await lib.genSalt(rounds);
    return lib.hash(password, salt);
  } catch {
    throw new Error("bcryptjs not installed. Run: npm install bcryptjs");
  }
}

async function bcryptVerify(password, hash) {
  try {
    const bcrypt = await import("bcryptjs");
    const lib    = bcrypt.default || bcrypt;
    return lib.compare(password, hash);
  } catch {
    throw new Error("bcryptjs not installed.");
  }
}

function parsePbkdf2Hash(hash) {
  const m = hash.match(/^\$pbkdf2-(sha256|sha512)\$(\d+)\$([0-9a-f]+)\$([0-9a-f]+)$/);
  if (!m) return null;
  return { algorithm: m[1].toUpperCase(), iterations: parseInt(m[2]), salt: m[3], hash: m[4], saltBytes: m[3].length / 2, hashBytes: m[4].length / 2 };
}

function parseBcryptHash(hash) {
  const m = hash.match(/^\$2[ayb]\$(\d+)\$.{53}$/);
  if (!m) return null;
  return { algorithm: "bcrypt", cost: parseInt(m[1]) };
}

// ============================================================
// PASSWORD STRENGTH
// ============================================================

function analyzePassword(password) {
  if (!password) return { score: 0, label: "None", barColor: "bg-gray-200", textColor: "text-gray-400", entropy: 0, checks: [] };
  const checks = [
    { id: "len8",    label: "≥ 8 characters",    pass: password.length >= 8  },
    { id: "len12",   label: "≥ 12 characters",   pass: password.length >= 12 },
    { id: "len20",   label: "≥ 20 characters",   pass: password.length >= 20 },
    { id: "upper",   label: "Uppercase (A-Z)",    pass: /[A-Z]/.test(password)        },
    { id: "lower",   label: "Lowercase (a-z)",    pass: /[a-z]/.test(password)        },
    { id: "digit",   label: "Digit (0-9)",        pass: /[0-9]/.test(password)        },
    { id: "special", label: "Special char (!@#…)",pass: /[^A-Za-z0-9]/.test(password) },
    { id: "nocommon",label: "Not a common word",  pass: !/(password|qwerty|admin|letmein|welcome|monkey|dragon|master|123456|abc123)/i.test(password) },
  ];
  const passed = checks.filter((c) => c.pass).length;
  let charset = 0;
  if (/[a-z]/.test(password)) charset += 26;
  if (/[A-Z]/.test(password)) charset += 26;
  if (/[0-9]/.test(password)) charset += 10;
  if (/[^A-Za-z0-9]/.test(password)) charset += 32;
  const entropy = charset > 0 ? Math.round(password.length * Math.log2(charset)) : 0;
  const levels = [
    { min: 0, max: 1, label: "Very Weak",   barColor: "bg-red-500",     textColor: "text-red-600"     },
    { min: 2, max: 3, label: "Weak",        barColor: "bg-orange-500",  textColor: "text-orange-600"  },
    { min: 4, max: 4, label: "Fair",        barColor: "bg-amber-500",   textColor: "text-amber-600"   },
    { min: 5, max: 5, label: "Good",        barColor: "bg-yellow-500",  textColor: "text-yellow-600"  },
    { min: 6, max: 6, label: "Strong",      barColor: "bg-lime-500",    textColor: "text-lime-600"    },
    { min: 7, max: 7, label: "Very Strong", barColor: "bg-green-500",   textColor: "text-green-600"   },
    { min: 8, max: 8, label: "Excellent",   barColor: "bg-emerald-500", textColor: "text-emerald-600" },
  ];
  const level = levels.find((l) => passed >= l.min && passed <= l.max) || levels[0];
  return { ...level, score: passed, maxScore: checks.length, checks, entropy };
}

// ============================================================
// ALGORITHM DEFINITIONS
// ============================================================

const ALGORITHMS = [
  {
    id: "pbkdf2-sha256", name: "PBKDF2-SHA256", category: "recommended",
    Icon: ShieldCheck,
    color: "text-green-700 bg-green-50 border-green-200", badgeColor: "bg-green-600", recommended: true,
    desc: "NIST recommended. 310,000 iterations. Native Web Crypto. No dependencies.",
    usedBy: "Django, Spring Security, OWASP ASVS",
    pros: ["No external library", "NIST FIPS 140-2 compliant", "Adjustable iterations", "Web Crypto native"],
    cons: ["Less memory-hard than Argon2", "GPU-parallelizable"],
    params: { iterations: 310000, keyLength: 32, hash: "SHA-256" },
  },
  {
    id: "pbkdf2-sha512", name: "PBKDF2-SHA512", category: "recommended",
    Icon: Shield,
    color: "text-blue-700 bg-blue-50 border-blue-200", badgeColor: "bg-blue-600", recommended: true,
    desc: "Higher security PBKDF2 variant. 210,000 iterations with SHA-512.",
    usedBy: "High-security applications",
    pros: ["512-bit output", "FIPS compliant", "No external library"],
    cons: ["Slower than SHA-256 PBKDF2", "GPU-parallelizable"],
    params: { iterations: 210000, keyLength: 64, hash: "SHA-512" },
  },
  {
    id: "bcrypt", name: "bcrypt", category: "recommended",
    Icon: Lock,
    color: "text-purple-700 bg-purple-50 border-purple-200", badgeColor: "bg-purple-600", recommended: true,
    desc: "Industry standard for password hashing. Cost factor 10. 72-byte input limit.",
    usedBy: "Node.js, Rails, PHP, Laravel",
    pros: ["Widely supported", "Time-tested", "Adaptive cost factor"],
    cons: ["72-byte truncation", "Not memory-hard", "Requires bcryptjs"],
    params: { rounds: 10 },
  },
  {
    id: "sha256", name: "SHA-256", category: "not-recommended",
    Icon: TriangleAlert,
    color: "text-red-700 bg-red-50 border-red-200", badgeColor: "bg-red-500", recommended: false,
    desc: "NOT for password storage. No salt, no iteration — trivially reversible with rainbow tables.",
    usedBy: "Data integrity only — NOT passwords",
    pros: ["Fast", "No dependencies"],
    cons: ["No salt", "No iterations", "GPU crackable in milliseconds", "Vulnerable to rainbow tables"],
    params: {},
  },
  {
    id: "sha512", name: "SHA-512", category: "not-recommended",
    Icon: TriangleAlert,
    color: "text-red-700 bg-red-50 border-red-200", badgeColor: "bg-red-500", recommended: false,
    desc: "NOT for password storage. Faster than SHA-256 on 64-bit hardware — even easier to crack.",
    usedBy: "Data integrity only — NOT passwords",
    pros: ["Fast", "No dependencies"],
    cons: ["No salt", "No iterations", "Even faster to crack than SHA-256 on 64-bit CPUs"],
    params: {},
  },
];

const RECOMMENDED   = ALGORITHMS.filter((a) => a.recommended);
const UNRECOMMENDED = ALGORITHMS.filter((a) => !a.recommended);

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SectionTabs({ active, onChange }) {
  const tabs = [
    { value: "generate", label: "Generate",       Icon: Lock       },
    { value: "verify",   label: "Verify",         Icon: CheckCircle },
    { value: "compare",  label: "Compare Algos",  Icon: BarChart3   },
    { value: "guide",    label: "Best Practices", Icon: BookOpen    },
  ];
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl flex-wrap sm:flex-nowrap">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex-1 justify-center min-w-0 ${
            active === tab.value ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <tab.Icon size={16} className="flex-shrink-0" />
          <span className="truncate">{tab.label}</span>
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
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${checked ? "bg-blue-600" : "bg-gray-300"}`}
      >
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
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
        <><Check size={12} /><span className="text-green-600">Copied!</span></>
      ) : (
        <><Copy size={12} />{label}</>
      )}
    </button>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
      <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-red-500" />
      <p className="text-xs font-mono text-red-700 leading-relaxed break-all">{message}</p>
    </div>
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

function LoadingBar({ message = "Hashing..." }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
      <Loader2 size={14} className="animate-spin text-blue-500 flex-shrink-0" />
      <p className="text-xs font-medium text-blue-700">{message}</p>
    </div>
  );
}

function StrengthMeter({ password }) {
  if (!password) return null;
  const s   = analyzePassword(password);
  const pct = Math.round((s.score / s.maxScore) * 100);
  return (
    <div className="space-y-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500">Password Strength</span>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold ${s.textColor}`}>{s.label}</span>
            <span className="text-xs text-gray-400">~{s.entropy} bits entropy</span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${s.barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {s.checks.map(({ id, label, pass }) => (
          <div key={id} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
            pass ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-400"
          }`}>
            {pass
              ? <Check size={10} className="text-green-600 flex-shrink-0" />
              : <X size={10} className="text-gray-300 flex-shrink-0" />
            }
            <span className="font-medium truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlgorithmCard({ algo, selected, onClick }) {
  const AlgoIcon = algo.Icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
        selected
          ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200 shadow-sm"
          : algo.recommended
          ? "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
          : "border-red-100 bg-red-50/30 hover:border-red-200"
      }`}
    >
      <AlgoIcon size={20} className={`flex-shrink-0 mt-0.5 ${selected ? "text-blue-600" : algo.recommended ? "text-gray-500" : "text-red-500"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={`text-xs font-bold ${selected ? "text-blue-800" : "text-gray-800"}`}>{algo.name}</span>
          {algo.recommended ? (
            <span className="text-xs font-semibold px-1.5 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-md">Recommended</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 bg-red-100 text-red-600 border border-red-200 rounded-md">
              <TriangleAlert size={10} />Not for passwords
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{algo.desc}</p>
      </div>
    </button>
  );
}

function HashResultCard({ hash, algoId, elapsed }) {
  if (!hash) return null;
  const algo    = ALGORITHMS.find((a) => a.id === algoId);
  const pbkdf2  = parsePbkdf2Hash(hash);
  const bcrypt  = algoId === "bcrypt" ? parseBcryptHash(hash) : null;
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{algo?.name} Hash</span>
          {elapsed && <span className="text-xs text-gray-400">computed in {elapsed}s</span>}
        </div>
        <CopyButton text={hash} />
      </div>
      <div className="px-4 py-4 bg-white space-y-3">
        <code className="block text-xs sm:text-sm font-mono font-bold text-gray-900 break-all leading-relaxed">{hash}</code>
        {pbkdf2 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { label: "Algorithm",  value: `PBKDF2-${pbkdf2.algorithm}`, color: "text-blue-700 bg-blue-50 border-blue-200"   },
              { label: "Iterations", value: pbkdf2.iterations.toLocaleString(), color: "text-purple-700 bg-purple-50 border-purple-200" },
              { label: "Salt",       value: `${pbkdf2.saltBytes} bytes`,   color: "text-amber-700 bg-amber-50 border-amber-200"   },
              { label: "Key length", value: `${pbkdf2.hashBytes} bytes`,   color: "text-green-700 bg-green-50 border-green-200"   },
            ].map(({ label, value, color }) => (
              <div key={label} className={`px-3 py-2 rounded-lg border ${color}`}>
                <p className="text-xs font-medium opacity-70">{label}</p>
                <p className="text-xs font-bold font-mono mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}
        {bcrypt && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: "Algorithm", value: "bcrypt",                    color: "text-purple-700 bg-purple-50 border-purple-200" },
              { label: "Cost",      value: `${bcrypt.cost} (2^${bcrypt.cost})`, color: "text-blue-700 bg-blue-50 border-blue-200" },
              { label: "Output",    value: "60 chars",                  color: "text-green-700 bg-green-50 border-green-200"    },
            ].map(({ label, value, color }) => (
              <div key={label} className={`px-3 py-2 rounded-lg border ${color}`}>
                <p className="text-xs font-medium opacity-70">{label}</p>
                <p className="text-xs font-bold font-mono mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}
        {(algoId === "sha256" || algoId === "sha512") && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <TriangleAlert size={14} className="flex-shrink-0 mt-0.5 text-red-500" />
            <p className="text-xs text-red-700 font-medium">
              This hash is <strong>NOT safe for password storage</strong>. It has no salt and no iterations —
              easily cracked with GPU rainbow tables. Use PBKDF2 or bcrypt instead.
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
          <Info size={12} />
          Store the complete hash string in your database. Never store the password.
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GENERATE SECTION
// ============================================================

function GenerateSection() {
  const [password,    setPassword]    = useState("");
  const [algorithm,   setAlgorithm]   = useState("pbkdf2-sha256");
  const [hash,        setHash]        = useState("");
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const [elapsed,     setElapsed]     = useState(null);
  const [hashHistory, setHashHistory] = useState([]);
  const abortRef = useRef(null);

  async function handleHash() {
    if (!password) { setError("Please enter a password to hash."); setHash(""); return; }
    if (algorithm === "bcrypt" && password.length > 72) {
      setError("bcrypt truncates passwords at 72 bytes. Consider PBKDF2 for longer passwords."); return;
    }
    const token = Symbol("pwhash");
    abortRef.current = token;
    setLoading(true); setError(null); setHash(""); setElapsed(null);
    const start = performance.now();
    try {
      let result = "";
      switch (algorithm) {
        case "pbkdf2-sha256": result = await pbkdf2Hash(password, { iterations: 310000, keyLength: 32, hash: "SHA-256" }); break;
        case "pbkdf2-sha512": result = await pbkdf2Hash(password, { iterations: 210000, keyLength: 64, hash: "SHA-512" }); break;
        case "bcrypt":        result = await bcryptHash(password, 10); break;
        case "sha256":        result = await shaHash(password, "SHA-256"); break;
        case "sha512":        result = await shaHash(password, "SHA-512"); break;
        default: throw new Error("Unknown algorithm.");
      }
      if (abortRef.current !== token) return;
      const ms = performance.now() - start;
      setHash(result); setElapsed((ms / 1000).toFixed(3));
      setHashHistory((prev) => [{ id: Date.now(), algo: algorithm, preview: password.slice(0, 3) + "***", hash: result, elapsed: (ms / 1000).toFixed(3), at: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);
    } catch (e) {
      if (abortRef.current !== token) return;
      setHash(""); setError(e.message || "Hashing failed.");
    } finally {
      if (abortRef.current === token) setLoading(false);
    }
  }

  useEffect(() => {
    function handler(e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleHash(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [password, algorithm]);

  return (
    <div className="space-y-4">
      {/* Algorithm selection */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Choose Algorithm</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {RECOMMENDED.map((algo) => (
            <AlgorithmCard key={algo.id} algo={algo} selected={algorithm === algo.id}
              onClick={() => { setAlgorithm(algo.id); setHash(""); setError(null); setElapsed(null); }} />
          ))}
        </div>
        <details className="group">
          <summary className="flex items-center gap-2 text-xs font-medium text-red-500 cursor-pointer hover:text-red-700 transition-colors list-none select-none">
            <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
            Show insecure algorithms (SHA-256, SHA-512) — educational purposes only
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {UNRECOMMENDED.map((algo) => (
              <AlgorithmCard key={algo.id} algo={algo} selected={algorithm === algo.id}
                onClick={() => { setAlgorithm(algo.id); setHash(""); setError(null); setElapsed(null); }} />
            ))}
          </div>
        </details>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleHash} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm">
          {loading ? <><Loader2 size={15} className="animate-spin" />Hashing...</> : <><Key size={15} />Hash Password</>}
        </button>
        <Toggle checked={showPass} onChange={setShowPass} label="Show password" description="Toggle password visibility" />
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {[
            { label: "Weak",       val: "password123"                    },
            { label: "Strong",     val: "Tr0ub4dor&3"                    },
            { label: "Passphrase", val: "correct-horse-battery-staple"   },
          ].map(({ label, val }) => (
            <button key={val} onClick={() => { setPassword(val); setHash(""); setError(null); setElapsed(null); }}
              className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 cursor-pointer transition-colors whitespace-nowrap">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Password input */}
      <div className="flex flex-col">
        <PanelHeader
          label="Password"
          meta={password ? `${password.length} chars${algorithm === "bcrypt" && password.length > 72 ? " — exceeds bcrypt limit" : ""}` : "Enter the password to hash"}
          actions={password && (
            <button onClick={() => { setPassword(""); setHash(""); setError(null); setElapsed(null); }}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">
              Clear
            </button>
          )}
        />
        {showPass ? (
          <textarea value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError(null); setHash(""); }}
            placeholder={"Enter password to hash..."}
            spellCheck={false} autoComplete="new-password"
            className={`w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none resize-none min-h-[120px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs ${algorithm === "bcrypt" && password.length > 72 ? "border-amber-300" : "border-gray-200"}`}
          />
        ) : (
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError(null); setHash(""); }}
            placeholder="Enter password to hash..." spellCheck={false} autoComplete="new-password"
            className={`w-full px-4 py-3.5 text-sm font-mono bg-white border border-t-0 rounded-b-xl outline-none focus:border-blue-400 transition-colors placeholder:text-gray-300 ${algorithm === "bcrypt" && password.length > 72 ? "border-amber-300" : "border-gray-200"}`}
          />
        )}
      </div>

      {password && <StrengthMeter password={password} />}

      {algorithm === "bcrypt" && password.length > 72 && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <TriangleAlert size={14} className="flex-shrink-0 mt-0.5 text-amber-500" />
          <p className="text-xs text-amber-700">
            <strong>bcrypt 72-byte limit:</strong> Characters beyond position 72 are silently ignored.
            Switch to <button onClick={() => setAlgorithm("pbkdf2-sha256")} className="underline cursor-pointer font-semibold hover:text-amber-900">PBKDF2-SHA256</button> for long passphrases.
          </p>
        </div>
      )}

      {loading && <LoadingBar message={`Computing ${ALGORITHMS.find((a) => a.id === algorithm)?.name}...`} />}
      <ErrorBanner message={error} />
      {hash && !loading && <HashResultCard hash={hash} algoId={algorithm} elapsed={elapsed} />}

      {hashHistory.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Hashes (session)</span>
            <button onClick={() => setHashHistory([])} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>
          </div>
          <div className="divide-y divide-gray-100">
            {hashHistory.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-default transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${ALGORITHMS.find((a) => a.id === item.algo)?.color || "text-gray-600 bg-gray-50 border-gray-200"}`}>
                      {ALGORITHMS.find((a) => a.id === item.algo)?.name || item.algo}
                    </span>
                    <span className="text-xs font-mono text-gray-500">{item.preview}</span>
                    <span className="text-xs text-gray-400">{item.elapsed}s · {item.at}</span>
                  </div>
                  <code className="text-xs font-mono text-gray-500 break-all">{item.hash}</code>
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

  function detectAlgorithm(h) {
    if (h.startsWith("$pbkdf2-sha256$")) return "pbkdf2-sha256";
    if (h.startsWith("$pbkdf2-sha512$")) return "pbkdf2-sha512";
    if (h.match(/^\$2[ayb]\$/)) return "bcrypt";
    if (h.match(/^[a-f0-9]{64}$/i)) return "sha256";
    if (h.match(/^[a-f0-9]{128}$/i)) return "sha512";
    return null;
  }

  async function handleVerify() {
    if (!password) { setError("Please enter the password to verify."); setResult(null); return; }
    const trimmedHash = hash.trim();
    if (!trimmedHash) { setError("Please paste the stored hash."); setResult(null); return; }
    const detectedAlgo = detectAlgorithm(trimmedHash);
    if (!detectedAlgo) {
      setError("Cannot detect hash algorithm. Supported: PBKDF2 ($pbkdf2-...), bcrypt ($2a/$2b/$2y$...), SHA-256 (64 hex chars), SHA-512 (128 hex chars).");
      setResult(null); return;
    }
    setLoading(true); setError(null); setResult(null); setElapsed(null);
    const start = performance.now();
    try {
      let matches = false;
      switch (detectedAlgo) {
        case "pbkdf2-sha256": case "pbkdf2-sha512": matches = await pbkdf2Verify(password, trimmedHash); break;
        case "bcrypt": matches = await bcryptVerify(password, trimmedHash); break;
        case "sha256": { const computed = await shaHash(password, "SHA-256"); matches = computed === trimmedHash.toLowerCase(); break; }
        case "sha512": { const computed = await shaHash(password, "SHA-512"); matches = computed === trimmedHash.toLowerCase(); break; }
      }
      const ms = performance.now() - start;
      setElapsed((ms / 1000).toFixed(3));
      setResult({ matches, algorithm: detectedAlgo, elapsed: (ms / 1000).toFixed(3) });
    } catch (e) {
      setError(e.message || "Verification failed."); setResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function handler(e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleVerify(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [password, hash]);

  const detectedAlgo    = hash.trim() ? detectAlgorithm(hash.trim()) : null;
  const detectedAlgoObj = detectedAlgo ? ALGORITHMS.find((a) => a.id === detectedAlgo) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
        <Info size={15} className="flex-shrink-0 mt-0.5 text-blue-500" />
        <p className="text-xs text-blue-700">
          Paste any supported hash — algorithm is <strong>auto-detected</strong> from the hash format.
          Supports PBKDF2-SHA256, PBKDF2-SHA512, bcrypt, SHA-256, SHA-512.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleVerify} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm">
          {loading ? <><Loader2 size={15} className="animate-spin" />Verifying...</> : <><ShieldCheck size={15} />Verify Password</>}
        </button>
        <Toggle checked={showPass} onChange={setShowPass} label="Show password" description="Toggle password visibility" />
        {detectedAlgoObj && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${detectedAlgoObj.color}`}>
            <detectedAlgoObj.Icon size={12} />
            <span>Detected: {detectedAlgoObj.name}</span>
          </div>
        )}
        <button onClick={() => { setPassword("Tr0ub4dor&3"); setHash("$pbkdf2-sha256$310000$a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6$placeholder"); setResult(null); setError(null); }}
          className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 cursor-pointer transition-colors ml-auto">
          Load sample
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <PanelHeader label="Password to verify" meta={password ? `${password.length} chars` : null}
            actions={password && <button onClick={() => { setPassword(""); setResult(null); if (error) setError(null); }} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
          />
          {showPass ? (
            <textarea value={password} onChange={(e) => { setPassword(e.target.value); setResult(null); if (error) setError(null); }}
              placeholder="Enter the plain-text password..." spellCheck={false} autoComplete="off"
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans" />
          ) : (
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setResult(null); if (error) setError(null); }}
              placeholder="Enter the plain-text password..." spellCheck={false} autoComplete="off"
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300" />
          )}
        </div>
        <div className="flex flex-col">
          <PanelHeader
            label="Stored Hash"
            meta={detectedAlgoObj ? `✓ ${detectedAlgoObj.name} detected` : hash.trim() ? "✗ Unknown format" : "Paste the hash from your database"}
            actions={hash && <button onClick={() => { setHash(""); setResult(null); if (error) setError(null); }} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
          />
          <textarea value={hash} onChange={(e) => { setHash(e.target.value); setResult(null); if (error) setError(null); }}
            placeholder={"Paste the stored hash...\n\nSupported formats:\n• $pbkdf2-sha256$...\n• $pbkdf2-sha512$...\n• $2a$10$... (bcrypt)\n• 64 hex chars (SHA-256)\n• 128 hex chars (SHA-512)"}
            spellCheck={false} autoCorrect="off"
            className={`flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none resize-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs ${
              hash.trim() && !detectedAlgoObj ? "border-amber-200" : hash.trim() && detectedAlgoObj ? "border-green-200" : "border-gray-200"
            }`}
          />
        </div>
      </div>

      {loading && <LoadingBar message={`Verifying ${detectedAlgoObj?.name || "hash"}...`} />}
      <ErrorBanner message={error} />

      {result && !loading && (
        <div className={`border-2 rounded-xl overflow-hidden ${result.matches ? "border-green-300" : "border-red-300"}`}>
          <div className={`flex items-center gap-3 px-5 py-4 ${result.matches ? "bg-green-50" : "bg-red-50"}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${result.matches ? "bg-green-100" : "bg-red-100"}`}>
              {result.matches
                ? <Check size={24} className="text-green-600" strokeWidth={2.5} />
                : <X size={24} className="text-red-600" />
              }
            </div>
            <div>
              <p className={`text-lg font-bold ${result.matches ? "text-green-800" : "text-red-800"}`}>
                {result.matches ? "Password Correct" : "Password Incorrect"}
              </p>
              <p className={`text-xs mt-0.5 ${result.matches ? "text-green-600" : "text-red-600"}`}>
                {result.matches
                  ? `Authentication successful. Verified via ${ALGORITHMS.find((a) => a.id === result.algorithm)?.name} in ${result.elapsed}s.`
                  : `Authentication failed. Password does not match the stored hash.`}
              </p>
            </div>
          </div>
          <div className="px-5 py-3 bg-white border-t border-gray-100">
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Algorithm:</span>
                <span className={`font-bold px-2 py-0.5 rounded border ${ALGORITHMS.find((a) => a.id === result.algorithm)?.color || ""}`}>
                  {ALGORITHMS.find((a) => a.id === result.algorithm)?.name || result.algorithm}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Verification time:</span>
                <span className="font-mono font-semibold text-gray-700">{result.elapsed}s</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPARE SECTION
// ============================================================

function CompareSection() {
  const [password, setPassword] = useState("");
  const [results,  setResults]  = useState([]);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef(null);

  const handleCompare = useCallback(async () => {
    if (!password) { setResults([]); return; }
    const token = Symbol("compare");
    abortRef.current = token;
    setLoading(true); setError(null); setResults([]);
    const algoList = [
      { id: "pbkdf2-sha256", fn: () => pbkdf2Hash(password, { iterations: 310000, keyLength: 32, hash: "SHA-256" }) },
      { id: "pbkdf2-sha512", fn: () => pbkdf2Hash(password, { iterations: 210000, keyLength: 64, hash: "SHA-512" }) },
      { id: "bcrypt",        fn: () => bcryptHash(password, 10) },
      { id: "sha256",        fn: () => shaHash(password, "SHA-256") },
      { id: "sha512",        fn: () => shaHash(password, "SHA-512") },
    ];
    setProgress({ current: 0, total: algoList.length });
    const computed = [];
    for (let i = 0; i < algoList.length; i++) {
      if (abortRef.current !== token) break;
      const { id, fn } = algoList[i];
      const start = performance.now();
      try {
        const h = await fn();
        const elapsed = ((performance.now() - start) / 1000).toFixed(3);
        computed.push({ id, hash: h, elapsed, error: null });
      } catch (e) {
        computed.push({ id, hash: null, elapsed: null, error: e.message });
      }
      setProgress({ current: i + 1, total: algoList.length });
    }
    if (abortRef.current === token) { setResults(computed); setLoading(false); }
  }, [password]);

  useEffect(() => {
    if (!password) { setResults([]); return; }
    const t = setTimeout(handleCompare, 500);
    return () => clearTimeout(t);
  }, [password, handleCompare]);

  useEffect(() => {
    function handler(e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleCompare(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCompare]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleCompare} disabled={loading || !password}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm">
          {loading
            ? <><Loader2 size={15} className="animate-spin" />{progress.current}/{progress.total} done...</>
            : <><BarChart3 size={15} />Compare All Algorithms</>
          }
        </button>
        <Toggle checked={showPass} onChange={setShowPass} label="Show password" description="Toggle password visibility" />
        <p className="text-xs text-gray-400">Auto-updates as you type</p>
        <button onClick={() => { setPassword("Tr0ub4dor&3"); setResults([]); setError(null); }}
          className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 cursor-pointer transition-colors ml-auto">
          Load sample
        </button>
      </div>

      <div className="flex flex-col">
        <PanelHeader label="Password to hash with all algorithms" meta={password ? `${password.length} chars` : null}
          actions={password && <button onClick={() => { setPassword(""); setResults([]); setError(null); }} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
        />
        {showPass ? (
          <textarea value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
            placeholder="Enter any password to see how each algorithm hashes it..." spellCheck={false} autoComplete="off"
            className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[100px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans" />
        ) : (
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
            placeholder="Enter password to compare all algorithms..." spellCheck={false} autoComplete="off"
            className="w-full px-4 py-3.5 text-sm font-mono bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none focus:border-blue-400 transition-colors placeholder:text-gray-300" />
        )}
      </div>

      {password && <StrengthMeter password={password} />}

      {loading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Hashing with algorithm {progress.current} of {progress.total}...</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      <ErrorBanner message={error} />

      {results.length > 0 && !loading && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Algorithm Comparison — Same Password, All Algorithms</span>
          </div>
          <div className="divide-y divide-gray-100">
            {results.map((item) => {
              const algo = ALGORITHMS.find((a) => a.id === item.id);
              const AlgoIcon = algo?.Icon;
              return (
                <div key={item.id} className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-default">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {AlgoIcon && <AlgoIcon size={16} className={algo?.recommended ? "text-gray-500" : "text-red-400"} />}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${algo?.color}`}>{algo?.name}</span>
                      {algo?.recommended ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                          <CheckCircle size={10} />Recommended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                          <XCircle size={10} />Not for passwords
                        </span>
                      )}
                      {item.elapsed && <span className="text-xs text-gray-400">{item.elapsed}s</span>}
                    </div>
                    {item.hash && <CopyButton text={item.hash} />}
                  </div>
                  {item.hash
                    ? <code className="text-xs font-mono text-gray-600 break-all leading-relaxed">{item.hash}</code>
                    : <p className="text-xs text-red-500 font-medium">{item.error}</p>
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!password && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-4">
          <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-sm">
            <BarChart3 size={28} className="text-gray-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-500">Enter a password to compare all hashing algorithms</p>
            <p className="text-xs text-gray-400 mt-1">See PBKDF2, bcrypt, SHA-256, SHA-512 side by side</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// GUIDE SECTION
// ============================================================

function GuideSection() {
  const rules = [
    { Icon: CheckCircle, iconColor: "text-green-600", good: true,  title: "Always use a slow, adaptive hashing algorithm",    desc: "Use bcrypt (cost 10-12), PBKDF2 (310,000+ iterations), scrypt, or Argon2. Never use MD5, SHA-1, SHA-256, or SHA-512 alone for passwords." },
    { Icon: Shield,      iconColor: "text-blue-600",  good: true,  title: "Always use a unique salt per password",             desc: "bcrypt and PBKDF2 generate salts automatically — never skip this. Salts prevent rainbow table attacks and make identical passwords produce different hashes." },
    { Icon: Timer,       iconColor: "text-purple-600",good: true,  title: "Tune cost factors for your hardware",               desc: "The hash function should take 100-300ms on production hardware. PBKDF2: 310,000 iterations for SHA-256. bcrypt: cost factor 10-12. Argon2: 64MB memory, 3 iterations." },
    { Icon: Lock,        iconColor: "text-gray-700",  good: true,  title: "Never store plain-text passwords",                  desc: "Store only the hash. Verify by re-hashing the provided password and comparing with the stored hash. Never decrypt or reverse a password hash." },
    { Icon: Ban,         iconColor: "text-red-600",   good: false, title: "Never use general-purpose hash functions",          desc: "MD5, SHA-1, SHA-256, SHA-512 are too fast — a GPU can compute billions per second. Always use password-specific hashing with key stretching." },
    { Icon: RefreshCw,   iconColor: "text-indigo-600",good: true,  title: "Implement hash migration strategy",                 desc: "When upgrading algorithms (e.g., MD5 to bcrypt), re-hash on next successful login. Wrap old hashes: bcrypt(sha256(password)) for immediate migration." },
    { Icon: Gauge,       iconColor: "text-amber-600", good: true,  title: "Enforce password length limits carefully",          desc: "bcrypt truncates at 72 bytes. For longer passwords, pre-hash with SHA-256 before bcrypt. PBKDF2 has no practical length limit." },
    { Icon: Zap,         iconColor: "text-cyan-600",  good: true,  title: "Use rate limiting and lockout",                    desc: "Combine secure hashing with: rate limiting (5 attempts/minute), account lockout, CAPTCHA after failures, and IP-based blocking for brute-force protection." },
  ];

  const comparisonData = [
    { algo: "Argon2id",      secure: true,  recommended: "Best",  speed: "Slow",    memory: "High",   notes: "OWASP #1 recommendation"        },
    { algo: "bcrypt",        secure: true,  recommended: "Good",  speed: "Slow",    memory: "Low",    notes: "72-byte limit, widely supported" },
    { algo: "scrypt",        secure: true,  recommended: "Good",  speed: "Slow",    memory: "Medium", notes: "Memory-hard, good for GPUs"      },
    { algo: "PBKDF2-SHA256", secure: true,  recommended: "Good",  speed: "Slow",    memory: "Low",    notes: "NIST/FIPS compliant, no deps"    },
    { algo: "PBKDF2-SHA512", secure: true,  recommended: "Good",  speed: "Slow",    memory: "Low",    notes: "Higher entropy output"           },
    { algo: "SHA-256 (raw)", secure: false, recommended: "Never", speed: "Instant", memory: "None",   notes: "GPU: billions/sec, no salt"      },
    { algo: "SHA-512 (raw)", secure: false, recommended: "Never", speed: "Instant", memory: "None",   notes: "Even faster on 64-bit CPUs"      },
    { algo: "MD5",           secure: false, recommended: "Never", speed: "Instant", memory: "None",   notes: "Broken, trivially crackable"     },
    { algo: "SHA-1",         secure: false, recommended: "Never", speed: "Instant", memory: "None",   notes: "Deprecated since 2011"           },
  ];

  return (
    <div className="space-y-6">
      {/* OWASP recommendation */}
      <div className="px-5 py-4 bg-green-50 border-2 border-green-200 rounded-xl space-y-1.5">
        <div className="flex items-center gap-2 mb-1">
          <Target size={16} className="text-green-700 flex-shrink-0" />
          <p className="text-sm font-bold text-green-800">OWASP Recommendation (2024)</p>
        </div>
        <ol className="space-y-1 text-xs text-green-700 list-decimal list-inside">
          <li><strong>Argon2id</strong> — Best. Memory-hard. Use when available.</li>
          <li><strong>bcrypt</strong> — Cost ≥ 10. Widely supported. 72-byte limit.</li>
          <li><strong>scrypt</strong> — N=32768, r=8, p=1. Memory-hard alternative.</li>
          <li><strong>PBKDF2-SHA256</strong> — 600,000 iterations (NIST 2023). FIPS compliant.</li>
        </ol>
        <p className="text-xs text-green-600 mt-1">
          This tool uses 310,000 PBKDF2 iterations (OWASP 2023 minimum) — upgrade to 600,000 in new production systems.
        </p>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Golden Rules of Password Hashing</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rules.map(({ Icon: RuleIcon, iconColor, title, desc, good }) => (
            <div key={title} className={`flex items-start gap-3 p-4 rounded-xl border ${good ? "bg-white border-gray-200" : "bg-red-50 border-red-200"}`}>
              <RuleIcon size={18} className={`flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div>
                <p className={`text-xs font-bold mb-1 ${good ? "text-gray-800" : "text-red-700"}`}>{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Algorithm comparison table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Algorithm Security Comparison</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Algorithm", "For Passwords?", "Speed", "Memory", "Notes"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {comparisonData.map((row) => (
                <tr key={row.algo} className={`hover:bg-gray-50 cursor-default transition-colors ${!row.secure ? "bg-red-50/40" : ""}`}>
                  <td className="px-4 py-2.5 font-mono font-bold text-gray-800 whitespace-nowrap">{row.algo}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      row.recommended === "Best" ? "bg-emerald-100 text-emerald-700" :
                      row.recommended === "Good" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>{row.recommended}</span>
                  </td>
                  <td className={`px-4 py-2.5 font-semibold whitespace-nowrap ${row.speed === "Slow" ? "text-green-600" : "text-red-500"}`}>{row.speed}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{row.memory}</td>
                  <td className="px-4 py-2.5 text-gray-500">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code examples */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Implementation Examples</p>
        {[
          { lang: "Node.js + bcrypt",  code: `const bcrypt = require("bcrypt");\n\n// Hash\nconst hash = await bcrypt.hash(password, 12);\n\n// Verify\nconst match = await bcrypt.compare(password, hash);` },
          { lang: "Python (Argon2)",   code: `from argon2 import PasswordHasher\n\nph = PasswordHasher()\nhash = ph.hash(password)\n\n# Verify\ntry:\n    ph.verify(hash, password)\nexcept Exception:\n    pass  # Invalid` },
          { lang: "PHP (password_hash)",code: `// Hash\n$hash = password_hash($password, PASSWORD_BCRYPT, ["cost" => 12]);\n\n// Verify\n$valid = password_verify($password, $hash);` },
        ].map(({ lang, code }) => (
          <div key={lang} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-xs font-mono font-semibold text-gray-300">{lang}</span>
              <CopyButton text={code} />
            </div>
            <pre className="px-4 py-3 bg-gray-900 text-green-400 text-xs font-mono overflow-x-auto whitespace-pre">{code}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PasswordHashGenerator() {
  const [activeTab, setActiveTab] = useState("generate");

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
        <ShieldCheck size={16} className="flex-shrink-0 mt-0.5 text-green-600" />
        <div>
          <p className="text-xs font-bold text-green-800">Password-Specific Hashing Tool</p>
          <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
            Supports <strong>PBKDF2-SHA256</strong>, <strong>PBKDF2-SHA512</strong>, and <strong>bcrypt</strong> — all designed for passwords.
            Also demonstrates why <strong>SHA-256/SHA-512 alone are unsafe</strong> for password storage.
            All hashing runs entirely in your browser — no data is transmitted.
          </p>
        </div>
      </div>
      <SectionTabs active={activeTab} onChange={setActiveTab} />
      {activeTab === "generate" && <GenerateSection />}
      {activeTab === "verify"   && <VerifySection />}
      {activeTab === "compare"  && <CompareSection />}
      {activeTab === "guide"    && <GuideSection />}
    </div>
  );
}