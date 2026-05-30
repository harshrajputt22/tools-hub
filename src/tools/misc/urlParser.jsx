"use client";
import { useState, useCallback } from "react";
import { AlertCircle, Link2 } from "lucide-react";

// ── Parse URL ─────────────────────────────────────────────────
function parseUrl(raw) {
  const trimmed = raw.trim();
  // Add protocol if missing so URL constructor works
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);

  const params = [];
  url.searchParams.forEach((value, key) => params.push({ key, value }));

  return {
    href:     url.href,
    protocol: url.protocol.replace(":", ""),
    hostname: url.hostname,
    port:     url.port || (url.protocol === "https:" ? "443 (default)" : "80 (default)"),
    pathname: url.pathname,
    search:   url.search || "—",
    hash:     url.hash || "—",
    origin:   url.origin,
    params,
  };
}

// ── Shared ─────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    if (!text || text === "—") return;
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handle} disabled={!text || text === "—"}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-default cursor-pointer text-gray-600 rounded transition-colors">
      {copied ? "✓" : "Copy"}
    </button>
  );
}

function FieldRow({ label, value, mono = true, badge }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 flex-shrink-0 w-24">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        {badge && <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 rounded font-mono">{badge}</span>}
      </div>
      <span className={`flex-1 text-sm text-gray-800 break-all ${mono ? "font-mono" : ""} ${value === "—" ? "text-gray-300" : ""}`}>{value}</span>
      <CopyButton text={value} />
    </div>
  );
}

export default function UrlParser() {
  const [input,  setInput]  = useState("");
  const [result, setResult] = useState(null);
  const [error,  setError]  = useState(null);

  const parse = useCallback((raw = input) => {
    const val = raw.trim();
    if (!val) { setResult(null); setError(null); return; }
    try {
      setResult(parseUrl(val));
      setError(null);
    } catch {
      setError("Invalid URL. Make sure it has a valid hostname (e.g. example.com or https://example.com).");
      setResult(null);
    }
  }, [input]);

  function handleInput(val) {
    setInput(val);
    if (val.trim()) {
      try { setResult(parseUrl(val)); setError(null); }
      catch { setResult(null); setError(null); } // silent error while typing
    } else {
      setResult(null); setError(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">URL Input</span>
        </div>
        <div className="flex items-center border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-white">
          <input
            type="text"
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="https://example.com/path?query=value#hash"
            className="flex-1 px-4 py-3 text-sm font-mono bg-white outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-300 placeholder:font-sans"
          />
          {input && (
            <button onClick={() => { setInput(""); setResult(null); setError(null); }}
              className="px-3 text-gray-400 hover:text-gray-600 cursor-pointer text-lg">×</button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500" />
          <p className="text-xs font-mono text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          {/* Structure */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parsed Components</span>
              <CopyButton text={result.href} />
            </div>
            <div className="px-4 py-1 bg-white border border-gray-200 border-t-0 rounded-b-xl divide-y divide-gray-50">
              <FieldRow label="Protocol" value={result.protocol} />
              <FieldRow label="Hostname" value={result.hostname} />
              <FieldRow label="Port"     value={result.port} />
              <FieldRow label="Origin"   value={result.origin} />
              <FieldRow label="Pathname" value={result.pathname} />
              <FieldRow label="Search"   value={result.search} />
              <FieldRow label="Hash"     value={result.hash} />
            </div>
          </div>

          {/* Query params */}
          {result.params.length > 0 && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Query Parameters</span>
                <span className="text-xs text-gray-400">{result.params.length} param(s)</span>
              </div>
              <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-1/3">Key</th>
                      <th className="text-left px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Value</th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {result.params.map(({ key, value }, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="px-4 py-2 font-mono text-blue-700 font-semibold text-xs">{key}</td>
                        <td className="px-4 py-2 font-mono text-gray-700 text-xs break-all">{value}</td>
                        <td className="px-4 py-2"><CopyButton text={value} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !error && !input && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Link2 className="w-16 h-16 opacity-30" />
          <p className="text-sm text-gray-400">Paste a URL above to see it parsed</p>
        </div>
      )}
    </div>
  );
}