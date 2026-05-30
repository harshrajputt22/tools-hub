"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Zap, ShieldCheck, FileText, Shuffle, KeyRound,
  Copy, Check, AlertCircle, Loader2,
  Download, Shield, Info, FolderOpen, X,
} from "lucide-react";
import { copyToClipboard, downloadText, readFileAsText } from "@/lib/helpers";

// ============================================================
// SHA-256 IMPLEMENTATION
// ============================================================

async function sha256(input) {
  try {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(input);
      const hashBuf = await window.crypto.subtle.digest("SHA-256", encoded);
      return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch { /* fall through */ }
  return sha256PureJS(input);
}

async function sha256File(arrayBuffer) {
  try {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const hashBuf = await window.crypto.subtle.digest("SHA-256", arrayBuffer);
      return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch { /* fall through */ }
  const text = new TextDecoder().decode(arrayBuffer);
  return sha256PureJS(text);
}

function sha256PureJS(msg) {
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const bytes = [];
  for (let i = 0; i < msg.length; i++) {
    const code = msg.charCodeAt(i);
    if (code < 0x80) { bytes.push(code); }
    else if (code < 0x800) { bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f)); }
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < msg.length) {
      const next = msg.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        const cp = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        i++;
      }
    } else { bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f)); }
  }
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0x00);
  for (let i = 7; i >= 0; i--) bytes.push((bitLength / Math.pow(2, i * 8)) & 0xff);
  const ROTR = (n, x) => (x >>> n) | (x << (32 - n));
  const Ch   = (x, y, z) => (x & y) ^ (~x & z);
  const Maj  = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
  const Σ0   = (x) => ROTR(2,x) ^ ROTR(13,x) ^ ROTR(22,x);
  const Σ1   = (x) => ROTR(6,x) ^ ROTR(11,x) ^ ROTR(25,x);
  const σ0   = (x) => ROTR(7,x) ^ ROTR(18,x) ^ (x >>> 3);
  const σ1   = (x) => ROTR(17,x) ^ ROTR(19,x) ^ (x >>> 10);
  for (let i = 0; i < bytes.length; i += 64) {
    const W = new Array(64);
    for (let t = 0; t < 16; t++) W[t] = ((bytes[i+t*4]&0xff)<<24)|((bytes[i+t*4+1]&0xff)<<16)|((bytes[i+t*4+2]&0xff)<<8)|(bytes[i+t*4+3]&0xff);
    for (let t = 16; t < 64; t++) W[t] = (σ1(W[t-2]) + W[t-7] + σ0(W[t-15]) + W[t-16]) | 0;
    let [a,b,c,d,e,f,g,h] = H;
    for (let t = 0; t < 64; t++) {
      const T1 = (h + Σ1(e) + Ch(e,f,g) + K[t] + W[t]) | 0;
      const T2 = (Σ0(a) + Maj(a,b,c)) | 0;
      h=g; g=f; f=e; e=(d+T1)|0; d=c; c=b; b=a; a=(T1+T2)|0;
    }
    H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0;
    H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
  }
  return H.map((word) => word.toString(16).padStart(8, "0")).join("");
}

// ============================================================
// CONSTANTS
// ============================================================

const SAMPLES = [
  { label: "Hello World",  value: "Hello, World!"                                                              },
  { label: "DevTools",     value: "DevTools"                                                                   },
  { label: "Empty string", value: ""                                                                           },
  { label: "Password",     value: "P@ssw0rd!123"                                                              },
  { label: "Lorem ipsum",  value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod."  },
  { label: "Unicode",      value: "日本語テスト 🔐 مرحبا بالعالم"                                             },
];

const KNOWN_HASHES = [
  { input: "",             hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
  { input: "hello",        hash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824" },
  { input: "Hello, World!",hash: "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986d" },
  { input: "password",     hash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8" },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SectionTabs({ active, onChange }) {
  const tabs = [
    { value: "generate", label: "Generate",  Icon: Zap       },
    { value: "verify",   label: "Verify",    Icon: ShieldCheck },
    { value: "file",     label: "File Hash", Icon: FileText   },
    { value: "compare",  label: "Compare",   Icon: Shuffle    },
    { value: "hmac",     label: "HMAC-256",  Icon: KeyRound   },
  ];
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl flex-wrap sm:flex-nowrap">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex-1 justify-center min-w-0 ${
            active === tab.value ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <tab.Icon size={15} className="flex-shrink-0" />
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
    <button onClick={handleCopy} disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors">
      {state === "copied"
        ? <><Check size={12} /><span className="text-green-600">Copied!</span></>
        : <><Copy size={12} />{label}</>
      }
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

function SecurityInfo() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
      <Shield size={16} className="flex-shrink-0 mt-0.5 text-green-600" />
      <div>
        <p className="text-xs font-bold text-green-800">SHA-256 is Secure</p>
        <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
          SHA-256 is part of the SHA-2 family and is considered <strong>cryptographically secure</strong> as of 2024. It produces a 256-bit hash and is used in TLS certificates, digital signatures, Bitcoin, and code signing. It is <strong>not suitable for password storage</strong> — use bcrypt, scrypt, or Argon2 for passwords.
        </p>
      </div>
    </div>
  );
}

function HashCard({ hash, uppercase, label = "SHA-256 Hash", showVariants = false }) {
  const [showAll, setShowAll] = useState(false);
  if (!hash) return null;
  const display = uppercase ? hash.toUpperCase() : hash;
  const chunks  = display.match(/.{1,8}/g) || [];
  const colors  = [
    "bg-blue-50 border-blue-200 text-blue-700",    "bg-purple-50 border-purple-200 text-purple-700",
    "bg-emerald-50 border-emerald-200 text-emerald-700", "bg-orange-50 border-orange-200 text-orange-700",
    "bg-rose-50 border-rose-200 text-rose-700",    "bg-cyan-50 border-cyan-200 text-cyan-700",
    "bg-amber-50 border-amber-200 text-amber-700", "bg-indigo-50 border-indigo-200 text-indigo-700",
  ];
  const variants = [
    { format: "Hex (lowercase)", value: hash.toLowerCase() },
    { format: "Hex (uppercase)", value: hash.toUpperCase() },
    { format: "Base64",          value: btoa(String.fromCharCode(...hash.match(/.{2}/g).map((h) => parseInt(h, 16)))) },
    { format: "0x prefix",       value: "0x" + hash.toLowerCase() },
    { format: "Colon separated", value: hash.match(/.{2}/g).join(":") },
  ];
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</span>
          <span className="text-xs text-gray-400">256-bit · 64 hex chars · 32 bytes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CopyButton text={display} />
          <button onClick={() => downloadText(display, "sha256.txt", "text/plain")}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors">
            <Download size={11} />Save
          </button>
        </div>
      </div>
      <div className="px-4 py-4 bg-white space-y-3">
        <code className="block text-sm font-mono font-bold text-gray-900 break-all leading-relaxed tracking-wide">{display}</code>
        <div className="flex flex-wrap gap-1.5">
          {chunks.map((chunk, i) => (
            <span key={i} title={`Word ${i + 1} of 8`} className={`text-xs font-mono px-2 py-1 rounded-lg border cursor-default ${colors[i % colors.length]}`}>
              {chunk}
            </span>
          ))}
        </div>
        {showVariants && (
          <div className="pt-1">
            <button onClick={() => setShowAll((v) => !v)} className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
              {showAll ? "Hide format variants" : "Show format variants"}
            </button>
            {showAll && (
              <div className="mt-2 space-y-1.5 border border-gray-100 rounded-xl overflow-hidden">
                {variants.map(({ format, value }) => (
                  <div key={format} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors">
                    <span className="text-xs font-medium text-gray-400 w-32 flex-shrink-0">{format}</span>
                    <code className="text-xs font-mono text-gray-700 flex-1 break-all">{value}</code>
                    <CopyButton text={value} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsRow({ input, hash, fileInfo }) {
  if (!hash) return null;
  const isFile = !!fileInfo;
  const items = [
    ...(!isFile
      ? [
          { label: "Input chars", value: input.length.toLocaleString() },
          { label: "Input bytes", value: new TextEncoder().encode(input).length.toLocaleString() },
        ]
      : [
          { label: "File",   value: fileInfo.name          },
          { label: "Size",   value: fileInfo.sizeFormatted },
        ]),
    { label: "Hash bits",  value: "256 bits"        },
    { label: "Hash bytes", value: "32 bytes"        },
    { label: "Hash words", value: "8 × 32-bit"      },
    { label: "Rounds",     value: "64"              },
    { label: "Algorithm",  value: "SHA-256 (SHA-2)" },
    { label: "NIST FIPS",  value: "180-4"           },
  ];
  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className="font-mono font-semibold text-gray-700 max-w-[200px] truncate" title={String(value)}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function LoadingBar({ message = "Computing SHA-256..." }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
      <Loader2 size={14} className="animate-spin text-blue-500 flex-shrink-0" />
      <p className="text-xs font-medium text-blue-700">{message}</p>
    </div>
  );
}

// ============================================================
// GENERATE SECTION
// ============================================================

function GenerateSection() {
  const [input,        setInput]        = useState("");
  const [hash,         setHash]         = useState("");
  const [error,        setError]        = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [uppercase,    setUppercase]    = useState(false);
  const [autoHash,     setAutoHash]     = useState(true);
  const [showEmpty,    setShowEmpty]    = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const abortRef = useRef(null);

  const handleGenerate = useCallback(async () => {
    const token = Symbol("sha256-token");
    abortRef.current = token;
    if (!input && !showEmpty) { setHash(""); setError(null); return; }
    setLoading(true); setError(null);
    try {
      const result = await sha256(input);
      if (abortRef.current !== token) return;
      setHash(result);
    } catch (e) {
      if (abortRef.current !== token) return;
      setHash(""); setError(e.message || "Failed to compute SHA-256 hash.");
    } finally {
      if (abortRef.current === token) setLoading(false);
    }
  }, [input, showEmpty]);

  useEffect(() => {
    if (!autoHash) return;
    const t = setTimeout(handleGenerate, 250);
    return () => clearTimeout(t);
  }, [input, autoHash, handleGenerate]);

  useEffect(() => { if (showEmpty || input) handleGenerate(); }, [showEmpty]);

  useEffect(() => {
    function handler(e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleGenerate(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleGenerate]);

  const display = uppercase && hash ? hash.toUpperCase() : hash;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleGenerate} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm">
          {loading ? <><Loader2 size={15} className="animate-spin" />Computing...</> : <><Zap size={15} />Generate SHA-256</>}
        </button>
        <Toggle checked={uppercase}    onChange={setUppercase}    label="Uppercase"       description="Display hash in uppercase (A-F vs a-f)" />
        <Toggle checked={autoHash}     onChange={setAutoHash}     label="Auto hash"       description="Hash automatically as you type" />
        <Toggle checked={showEmpty}    onChange={setShowEmpty}    label="Hash empty"      description="Compute SHA-256 of empty string" />
        <Toggle checked={showVariants} onChange={setShowVariants} label="Format variants" description="Show hash in multiple output formats" />
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {SAMPLES.filter((s) => s.value).slice(0, 4).map((s) => (
            <button key={s.value} onClick={() => { setInput(s.value); setHash(""); setError(null); }}
              className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 cursor-pointer transition-colors whitespace-nowrap">
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <PanelHeader
          label="Input"
          meta={input ? `${input.length.toLocaleString()} chars · ${new TextEncoder().encode(input).length} bytes` : null}
          actions={input && (
            <button onClick={() => { setInput(""); setHash(""); setError(null); }}
              className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>
          )}
        />
        <textarea value={input} onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
          placeholder={`Type or paste text to hash...\n\nSHA-256 use cases:\n• Data integrity verification\n• Digital signatures (with asymmetric keys)\n• TLS/SSL certificate chains\n• JWT token signatures\n• Code signing & git commits\n• Blockchain transaction hashing`}
          spellCheck={false} autoCorrect="off" autoCapitalize="off"
          className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[180px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
        />
      </div>

      {loading && <LoadingBar />}
      <ErrorBanner message={error} />
      {display && !loading && <HashCard hash={display} uppercase={false} showVariants={showVariants} />}
      {hash && !loading && <StatsRow input={input} hash={hash} />}
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
    if (!input.trim()) { setError("Please enter the text to verify."); setResult(null); return; }
    const cleanExpected = expected.trim().toLowerCase();
    if (!cleanExpected) { setError("Please enter the expected SHA-256 hash."); setResult(null); return; }
    if (!/^[a-f0-9]{64}$/.test(cleanExpected)) {
      setError(`Invalid SHA-256 hash. Expected exactly 64 hexadecimal characters, got ${cleanExpected.length}.`);
      setResult(null); return;
    }
    setLoading(true); setError(null);
    try {
      const computed = await sha256(input.trim());
      const matches  = computed === cleanExpected;
      setResult({ computed, expected: cleanExpected, matches });
    } catch (e) {
      setError(e.message || "Failed to compute SHA-256."); setResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function handler(e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleVerify(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [input, expected]);

  const expectedLen = expected.trim().length;
  const expectedOk  = expectedLen === 0 || /^[a-f0-9]{0,64}$/.test(expected.trim().toLowerCase());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleVerify} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm">
          {loading ? <><Loader2 size={15} className="animate-spin" />Verifying...</> : <><ShieldCheck size={15} />Verify Integrity</>}
        </button>
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {KNOWN_HASHES.slice(0, 3).map((kh) => (
            <button key={kh.hash} onClick={() => { setInput(kh.input); setExpected(kh.hash); setResult(null); setError(null); }}
              className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 cursor-pointer transition-colors whitespace-nowrap">
              {kh.input ? `"${kh.input}"` : "(empty)"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <PanelHeader label="Input Text" meta={input ? `${input.length.toLocaleString()} chars` : null}
            actions={input && <button onClick={() => { setInput(""); setResult(null); if (error) setError(null); }} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
          />
          <textarea value={input} onChange={(e) => { setInput(e.target.value); setResult(null); if (error) setError(null); }}
            placeholder="Enter the text to verify..." spellCheck={false} autoCorrect="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[160px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
          />
        </div>
        <div className="flex flex-col">
          <PanelHeader
            label="Expected SHA-256 Hash"
            meta={expectedLen > 0 ? expectedOk ? expectedLen === 64 ? "✓ Valid 64-char hash" : `${expectedLen}/64 chars` : "✗ Invalid hex chars" : null}
            actions={expected && <button onClick={() => { setExpected(""); setResult(null); if (error) setError(null); }} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
          />
          <textarea value={expected} onChange={(e) => { setExpected(e.target.value); setResult(null); if (error) setError(null); }}
            placeholder={"Paste expected SHA-256 hash...\n\n64 hexadecimal characters\nExample:\ne3b0c44298fc1c149afbf4c8996fb924\n27ae41e4649b934ca495991b7852b855"}
            spellCheck={false} autoCorrect="off"
            className={`flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none resize-none min-h-[160px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs ${
              expectedLen > 0 && !expectedOk ? "border-red-300" : expectedLen === 64 ? "border-green-300" : "border-gray-200"
            }`}
          />
        </div>
      </div>

      {loading && <LoadingBar message="Verifying hash integrity..." />}
      <ErrorBanner message={error} />

      {result && !loading && (
        <div className={`border-2 rounded-xl overflow-hidden ${result.matches ? "border-green-300" : "border-red-300"}`}>
          <div className={`flex items-center gap-3 px-5 py-4 ${result.matches ? "bg-green-50" : "bg-red-50"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${result.matches ? "bg-green-100" : "bg-red-100"}`}>
              {result.matches
                ? <Check size={20} className="text-green-600" strokeWidth={2.5} />
                : <X size={20} className="text-red-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-base font-bold ${result.matches ? "text-green-800" : "text-red-800"}`}>
                {result.matches ? "Hash Match — Data Integrity Confirmed" : "Hash Mismatch — Data May Be Corrupted or Tampered"}
              </p>
              <p className={`text-xs mt-0.5 ${result.matches ? "text-green-600" : "text-red-600"}`}>
                {result.matches ? "Computed SHA-256 matches expected hash exactly. Data is intact." : "Hashes do not match. Data may have been modified or the hash is incorrect."}
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-100 bg-white">
            {[
              { label: "Computed", value: result.computed },
              { label: "Expected", value: result.expected },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3 px-5 py-3">
                <span className="text-xs font-bold text-gray-400 w-20 flex-shrink-0 uppercase tracking-wider pt-0.5">{label}:</span>
                <code className={`text-xs font-mono font-bold flex-1 break-all leading-relaxed tracking-wide ${
                  result.matches ? "text-green-700" : label === "Computed" ? "text-red-700" : "text-gray-700"
                }`}>{value}</code>
                <div className="flex-shrink-0"><CopyButton text={value} /></div>
              </div>
            ))}
          </div>
          {!result.matches && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                Byte-level diff ({result.computed.split("").filter((c, i) => c !== result.expected[i]).length} chars differ):
              </p>
              <div className="flex flex-wrap gap-0.5 font-mono text-xs">
                {result.computed.split("").map((char, i) => (
                  <span key={i} title={`Position ${i}: computed=${char}, expected=${result.expected[i] ?? "?"}`}
                    className={`px-0.5 py-0.5 rounded cursor-default transition-colors ${
                      char === result.expected[i] ? "text-gray-400" : "bg-red-100 text-red-700 font-bold ring-1 ring-red-300"
                    }`}>{char}</span>
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
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3)   return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  async function processFile(file) {
    setError(null); setHash(""); setProgress(0); setFileInfo(null);
    if (!file) return;
    const MAX = 512 * 1024 * 1024;
    if (file.size > MAX) { setError(`File exceeds the 512MB limit. File size: ${formatSize(file.size)}.`); return; }
    setLoading(true);
    setFileInfo({ name: file.name, size: file.size, sizeFormatted: formatSize(file.size), type: file.type || "application/octet-stream", lastModified: new Date(file.lastModified).toLocaleString() });
    try {
      setProgress(10);
      const arrayBuf = await file.arrayBuffer();
      setProgress(60);
      const result = await sha256File(arrayBuf);
      setProgress(100);
      setHash(result);
    } catch (e) {
      setError("Failed to hash file: " + (e.message || "Unknown error")); setHash("");
    } finally {
      setLoading(false);
    }
  }

  const display = uppercase && hash ? hash.toUpperCase() : hash;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <Toggle checked={uppercase} onChange={setUppercase} label="Uppercase" description="Display hash in uppercase" />
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Info size={12} />
          Uses Web Crypto API · Supports any file type · Max 512MB
        </div>
        {fileInfo && (
          <button onClick={() => { setHash(""); setFileInfo(null); setError(null); setProgress(0); if (inputRef.current) inputRef.current.value = ""; }}
            className="ml-auto text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-gray-200">
            Clear file
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) processFile(file); }}
        onClick={() => !loading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 py-14 border-2 border-dashed rounded-xl transition-all select-none ${
          loading ? "border-blue-300 bg-blue-50/50 cursor-default"
          : dragging ? "border-blue-400 bg-blue-50 scale-[1.02] cursor-copy"
          : fileInfo ? "border-green-300 bg-green-50/50 cursor-pointer hover:border-green-400"
          : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer"
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />

        {loading ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm px-6">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-blue-700">Computing SHA-256...</p>
            <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-blue-500 text-center truncate max-w-full">{fileInfo?.name} — {fileInfo?.sizeFormatted}</p>
          </div>
        ) : fileInfo ? (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
              <FileText size={28} className="text-green-600" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-semibold text-green-700 break-all max-w-xs">{fileInfo.name}</p>
              <p className="text-xs text-green-500 mt-1">{fileInfo.sizeFormatted} · {fileInfo.type}</p>
              <p className="text-xs text-green-400 mt-0.5">Click to change file</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center shadow-sm">
              <FolderOpen size={30} className="text-gray-300" />
            </div>
            <div className="text-center px-8">
              <p className="text-sm font-semibold text-gray-600">
                {dragging ? "Drop file to compute SHA-256" : "Drop any file or click to browse"}
              </p>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Any file type · Up to 512MB<br />
                Uses native Web Crypto API for accurate binary file hashing
              </p>
            </div>
          </>
        )}
      </div>

      <ErrorBanner message={error} />
      {display && !loading && <HashCard hash={display} uppercase={false} label={`SHA-256 of "${fileInfo?.name}"`} />}

      {fileInfo && hash && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "File name",     value: fileInfo.name          },
            { label: "File size",     value: fileInfo.sizeFormatted },
            { label: "MIME type",     value: fileInfo.type          },
            { label: "Last modified", value: fileInfo.lastModified  },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="text-xs text-gray-400 font-medium">{label}</span>
              <span className="text-xs font-semibold font-mono text-gray-700 truncate" title={value}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPARE SECTION
// ============================================================

function CompareSection() {
  const [inputA,   setInputA]   = useState("");
  const [inputB,   setInputB]   = useState("");
  const [hashA,    setHashA]    = useState("");
  const [hashB,    setHashB]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [compared, setCompared] = useState(false);

  const handleCompare = useCallback(async () => {
    if (!inputA && !inputB) { setCompared(false); return; }
    setLoading(true); setError(null); setCompared(false);
    try {
      const [ha, hb] = await Promise.all([sha256(inputA), sha256(inputB)]);
      setHashA(ha); setHashB(hb); setCompared(true);
    } catch (e) {
      setError(e.message || "Failed to compute hashes.");
    } finally {
      setLoading(false);
    }
  }, [inputA, inputB]);

  useEffect(() => {
    if (!inputA && !inputB) return;
    const t = setTimeout(handleCompare, 400);
    return () => clearTimeout(t);
  }, [inputA, inputB, handleCompare]);

  useEffect(() => {
    function handler(e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleCompare(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCompare]);

  const match  = compared && hashA === hashB;
  const differ = compared && hashA !== hashB;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleCompare} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm">
          {loading ? <><Loader2 size={15} className="animate-spin" />Comparing...</> : <><Shuffle size={15} />Compare Hashes</>}
        </button>
        <p className="text-xs text-gray-400">Hash two inputs simultaneously — auto-updates as you type</p>
        <button onClick={() => { setInputA(""); setInputB(""); setHashA(""); setHashB(""); setCompared(false); setError(null); }}
          className="ml-auto text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-gray-200">
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { id: "A", value: inputA, setter: setInputA },
          { id: "B", value: inputB, setter: setInputB },
        ].map(({ id, value, setter }) => (
          <div key={id} className="space-y-2">
            <div className="flex flex-col">
              <PanelHeader label={`Input ${id}`} meta={value ? `${value.length.toLocaleString()} chars` : null}
                actions={value && <button onClick={() => { setter(""); setCompared(false); }} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
              />
              <textarea value={value} onChange={(e) => { setter(e.target.value); setCompared(false); }}
                placeholder={`Paste text ${id}...`} spellCheck={false} autoCorrect="off"
                className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[120px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
              />
            </div>
            {compared && (id === "A" ? hashA : hashB) && (
              <div className={`px-4 py-3 rounded-xl border text-xs font-mono ${match ? "bg-green-50 border-green-200 text-green-800" : "bg-gray-50 border-gray-200 text-gray-700"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">SHA-256</span>
                  <CopyButton text={id === "A" ? hashA : hashB} />
                </div>
                <code className="break-all font-bold tracking-wide leading-relaxed">{id === "A" ? hashA : hashB}</code>
              </div>
            )}
          </div>
        ))}
      </div>

      {loading && <LoadingBar message="Computing both SHA-256 hashes..." />}
      <ErrorBanner message={error} />

      {compared && (match || differ) && (
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 ${match ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${match ? "bg-green-100" : "bg-red-100"}`}>
            {match
              ? <Check size={20} className="text-green-600" strokeWidth={2.5} />
              : <X size={20} className="text-red-600" />
            }
          </div>
          <div>
            <p className={`font-bold text-base ${match ? "text-green-800" : "text-red-800"}`}>
              {match ? "Identical — Both inputs produce the same SHA-256 hash" : "Different — Inputs produce unique SHA-256 hashes"}
            </p>
            <p className={`text-xs mt-0.5 ${match ? "text-green-600" : "text-red-600"}`}>
              {match ? "Both strings are byte-for-byte identical." : "The avalanche effect means even a 1-character difference produces a completely different hash."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HMAC-SHA256 SECTION
// ============================================================

function HmacSection() {
  const [message,   setMessage]   = useState("");
  const [secret,    setSecret]    = useState("");
  const [hmac,      setHmac]      = useState("");
  const [error,     setError]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [showKey,   setShowKey]   = useState(false);
  const [uppercase, setUppercase] = useState(false);
  const abortRef = useRef(null);

  const handleCompute = useCallback(async () => {
    const token = Symbol("hmac-token");
    abortRef.current = token;
    if (!message.trim()) { setError("Please enter a message to sign."); setHmac(""); return; }
    if (!secret.trim())  { setError("Please enter a secret key."); setHmac(""); return; }
    setLoading(true); setError(null);
    try {
      if (!window.crypto?.subtle) throw new Error("Web Crypto API not available. HMAC requires a secure context (HTTPS).");
      const enc    = new TextEncoder();
      const keyMat = await window.crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig    = await window.crypto.subtle.sign("HMAC", keyMat, enc.encode(message));
      if (abortRef.current !== token) return;
      const result = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
      setHmac(result);
    } catch (e) {
      if (abortRef.current !== token) return;
      setHmac(""); setError(e.message || "HMAC computation failed.");
    } finally {
      if (abortRef.current === token) setLoading(false);
    }
  }, [message, secret]);

  useEffect(() => {
    if (!message.trim() || !secret.trim()) return;
    const t = setTimeout(handleCompute, 400);
    return () => clearTimeout(t);
  }, [message, secret, handleCompute]);

  useEffect(() => {
    function handler(e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleCompute(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCompute]);

  const display = uppercase && hmac ? hmac.toUpperCase() : hmac;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
        <KeyRound size={15} className="flex-shrink-0 mt-0.5 text-indigo-500" />
        <p className="text-xs text-indigo-700 leading-relaxed">
          <strong>HMAC-SHA256</strong> (Hash-based Message Authentication Code) uses a secret key to produce a keyed hash.
          It provides both <strong>data integrity</strong> and <strong>authentication</strong>. Used in JWT signatures, API request signing, and webhook verification.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleCompute} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm">
          {loading ? <><Loader2 size={15} className="animate-spin" />Computing...</> : <><KeyRound size={15} />Compute HMAC-SHA256</>}
        </button>
        <Toggle checked={uppercase} onChange={setUppercase} label="Uppercase" />
        <Toggle checked={showKey}   onChange={setShowKey}   label="Show key"  description="Toggle secret key visibility" />
        <button onClick={() => { setMessage("Hello, World!"); setSecret("my-secret-key"); setHmac(""); setError(null); }}
          className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 cursor-pointer transition-colors ml-auto">
          Load sample
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <PanelHeader label="Message" meta={message ? `${message.length.toLocaleString()} chars` : null}
            actions={message && <button onClick={() => { setMessage(""); setHmac(""); if (error) setError(null); }} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
          />
          <textarea value={message} onChange={(e) => { setMessage(e.target.value); if (error) setError(null); setHmac(""); }}
            placeholder={"Enter the message to sign...\n\nExamples:\n• API request body\n• JWT payload\n• Webhook payload"}
            spellCheck={false} autoCorrect="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[160px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>
        <div className="flex flex-col">
          <PanelHeader label="Secret Key" meta={secret ? `${secret.length} chars` : "Keep this private!"}
            actions={secret && <button onClick={() => { setSecret(""); setHmac(""); if (error) setError(null); }} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
          />
          {showKey ? (
            <textarea value={secret} onChange={(e) => { setSecret(e.target.value); if (error) setError(null); setHmac(""); }}
              placeholder={"Enter your secret key...\n\nBest practices:\n• Use at least 32 random bytes\n• Never reuse keys across systems\n• Rotate keys regularly"}
              spellCheck={false} autoCorrect="off"
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[160px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
            />
          ) : (
            <input type="password" value={secret} onChange={(e) => { setSecret(e.target.value); if (error) setError(null); setHmac(""); }}
              placeholder="Enter secret key..." spellCheck={false}
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none min-h-[160px] focus:border-blue-400 transition-colors placeholder:text-gray-300"
            />
          )}
        </div>
      </div>

      {loading && <LoadingBar message="Computing HMAC-SHA256..." />}
      <ErrorBanner message={error} />

      {display && !loading && (
        <div className="border border-indigo-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">HMAC-SHA256 Signature</span>
              <span className="text-xs text-indigo-400">256-bit · 64 hex chars</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CopyButton text={display} />
              <button onClick={() => downloadText(display, "hmac-sha256.txt", "text/plain")}
                className="text-xs font-medium text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">
                Save
              </button>
            </div>
          </div>
          <div className="px-4 py-4 bg-white space-y-3">
            <code className="block text-sm font-mono font-bold text-indigo-900 break-all leading-relaxed tracking-wide">{display}</code>
            <div className="flex flex-wrap gap-1.5">
              {(display.match(/.{1,8}/g) || []).map((chunk, i) => (
                <span key={i} className="text-xs font-mono px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg cursor-default">{chunk}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {hmac && !loading && (
        <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
          {[
            { label: "Algorithm",  value: "HMAC-SHA256"                                       },
            { label: "Key length", value: `${new TextEncoder().encode(secret).length} bytes`  },
            { label: "Output",     value: "256 bits · 64 hex chars"                           },
            { label: "Crypto API", value: "Web Crypto (FIPS 198-1)"                           },
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

export default function Sha256Generator() {
  const [activeTab, setActiveTab] = useState("generate");

  return (
    <div className="space-y-5">
      <SecurityInfo />
      <SectionTabs active={activeTab} onChange={setActiveTab} />
      {activeTab === "generate" && <GenerateSection />}
      {activeTab === "verify"   && <VerifySection />}
      {activeTab === "file"     && <FileHashSection />}
      {activeTab === "compare"  && <CompareSection />}
      {activeTab === "hmac"     && <HmacSection />}
    </div>
  );
}