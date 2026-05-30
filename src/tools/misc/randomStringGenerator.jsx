"use client";
import { useState, useCallback, useMemo } from "react";
import { AlertCircle, Key } from "lucide-react";

const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers:   "0123456789",
  symbols:   "!@#$%^&*()-_=+[]{}|;:,.<>?",
};

function generateSecureString(length, charset) {
  if (typeof window !== "" && window.crypto?.getRandomValues) {
    const arr    = new Uint32Array(length);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (n) => charset[n % charset.length]).join("");
  }
  // Fallback (non-crypto)
  return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join("");
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle} disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors">
      {copied
        ? <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg><span className="text-green-600">Copied!</span></>
        : <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>}
    </button>
  );
}

function PanelHeader({ label, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        {meta && <span className="text-xs text-gray-400">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors select-none">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${checked ? "bg-blue-600" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

export default function RandomStringGenerator() {
  const [length,   setLength]   = useState(24);
  const [upper,    setUpper]    = useState(true);
  const [lower,    setLower]    = useState(true);
  const [numbers,  setNumbers]  = useState(true);
  const [symbols,  setSymbols]  = useState(false);
  const [output,   setOutput]   = useState("");
  const [count,    setCount]    = useState(1);
  const [error,    setError]    = useState(null);

  const charset = useMemo(() => {
    let c = "";
    if (upper)   c += CHARSETS.uppercase;
    if (lower)   c += CHARSETS.lowercase;
    if (numbers) c += CHARSETS.numbers;
    if (symbols) c += CHARSETS.symbols;
    return c;
  }, [upper, lower, numbers, symbols]);

  const handleGenerate = useCallback(() => {
    if (!charset) { setError("Select at least one character type."); setOutput(""); return; }
    setError(null);
    const results = Array.from({ length: count }, () => generateSecureString(length, charset));
    setOutput(results.join("\n"));
  }, [charset, length, count]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Controls */}
        <div className="flex flex-col">
          <PanelHeader label="Configuration" />
          <div className="flex flex-col gap-4 p-5 bg-white border border-gray-200 border-t-0 rounded-b-xl">
            {/* Length */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Length</label>
                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{length}</span>
              </div>
              <input type="range" min={4} max={256} value={length} onChange={(e) => setLength(+e.target.value)}
                className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer" />
            </div>

            {/* Count */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Count</label>
                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{count}</span>
              </div>
              <input type="range" min={1} max={20} value={count} onChange={(e) => setCount(+e.target.value)}
                className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer" />
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <Toggle checked={upper}   onChange={setUpper}   label="Uppercase A–Z" />
              <Toggle checked={lower}   onChange={setLower}   label="Lowercase a–z" />
              <Toggle checked={numbers} onChange={setNumbers} label="Numbers 0–9" />
              <Toggle checked={symbols} onChange={setSymbols} label="Symbols !@#…" />
            </div>

            {/* Charset preview */}
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-400">Pool: </span>
              <span className="text-xs font-mono text-gray-600">{charset ? `${charset.length} chars` : "— none selected —"}</span>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader label="Output" meta={output ? `${count} string(s)` : null} actions={output && <CopyButton text={output} />} />
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[240px] relative">
            {output ? (
              <textarea readOnly value={output} spellCheck={false}
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none text-gray-800 cursor-default select-all" />
            ) : (
              <div className="flex flex-col items-center justify-center w-full gap-2 pointer-events-none">
                <Key className="w-12 h-12 opacity-20" />
                <p className="text-xs text-gray-300">Generated strings appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500" />
          <p className="text-xs font-mono text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleGenerate} disabled={!charset}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          Generate
        </button>
        {output && <CopyButton text={output} />}
        {output && <button onClick={() => setOutput("")} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}
      </div>
    </div>
  );
}