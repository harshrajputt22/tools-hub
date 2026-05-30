"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// HTTP HEADER CHECKER
// Fetches and displays response headers from a URL
// Uses a public CORS proxy since browser can't directly
// inspect another origin's headers
// ============================================================

// ── Header descriptions ───────────────────────────────────────
const HEADER_INFO = {
  "content-type":                 { desc: "Media type of the response body",                                    category: "content"  },
  "content-length":               { desc: "Size of the response body in bytes",                                 category: "content"  },
  "content-encoding":             { desc: "Compression applied to the body (gzip, br, deflate)",               category: "content"  },
  "content-language":             { desc: "Natural language of the intended audience",                          category: "content"  },
  "transfer-encoding":            { desc: "Transfer encoding applied to the response",                          category: "content"  },
  "cache-control":                { desc: "Directives for caching in requests and responses",                   category: "caching"  },
  "etag":                         { desc: "Identifier for a specific version of a resource",                    category: "caching"  },
  "last-modified":                { desc: "Last modification date of the resource",                             category: "caching"  },
  "expires":                      { desc: "Date/time after which the response is stale",                        category: "caching"  },
  "vary":                         { desc: "Determines which request headers affect caching",                    category: "caching"  },
  "age":                          { desc: "Time (seconds) the response has been cached",                        category: "caching"  },
  "access-control-allow-origin":  { desc: "Which origins can access the resource (CORS)",                      category: "security" },
  "access-control-allow-methods": { desc: "HTTP methods allowed in CORS requests",                             category: "security" },
  "access-control-allow-headers": { desc: "Headers allowed in CORS requests",                                  category: "security" },
  "strict-transport-security":    { desc: "Forces HTTPS — protects against downgrade attacks (HSTS)",          category: "security" },
  "content-security-policy":      { desc: "Controls resources the browser can load (CSP)",                     category: "security" },
  "x-frame-options":              { desc: "Controls whether page can be embedded in iframes",                  category: "security" },
  "x-content-type-options":       { desc: "Prevents MIME type sniffing (nosniff)",                             category: "security" },
  "x-xss-protection":             { desc: "Legacy XSS filter (deprecated in modern browsers)",                 category: "security" },
  "referrer-policy":              { desc: "Controls how much referrer info is sent with requests",             category: "security" },
  "permissions-policy":           { desc: "Controls browser features and APIs (camera, mic, etc.)",           category: "security" },
  "server":                       { desc: "Information about the server software",                             category: "server"   },
  "x-powered-by":                 { desc: "Technology powering the server (often suppressed for security)",   category: "server"   },
  "date":                         { desc: "Date and time when the message was sent",                           category: "server"   },
  "connection":                   { desc: "Controls whether connection stays open after the request",          category: "server"   },
  "location":                     { desc: "URL to redirect the request to (3xx responses)",                   category: "server"   },
  "set-cookie":                   { desc: "Sends a cookie from the server to the client",                     category: "server"   },
  "www-authenticate":             { desc: "Authentication method required to access the resource",            category: "server"   },
};

const CATEGORY_COLORS = {
  content:  "bg-blue-50 text-blue-700 border-blue-200",
  caching:  "bg-amber-50 text-amber-700 border-amber-200",
  security: "bg-green-50 text-green-700 border-green-200",
  server:   "bg-purple-50 text-purple-700 border-purple-200",
  other:    "bg-gray-50 text-gray-600 border-gray-200",
};

// ── Security grader ───────────────────────────────────────────
function gradeHeaders(headers) {
  const checks = [
    {
      header: "strict-transport-security",
      label:  "HSTS",
      pass:   (v) => !!v,
      tip:    "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains",
    },
    {
      header: "content-security-policy",
      label:  "CSP",
      pass:   (v) => !!v,
      tip:    "Add a Content-Security-Policy header to restrict resource loading.",
    },
    {
      header: "x-frame-options",
      label:  "X-Frame-Options",
      pass:   (v) => v?.toLowerCase() === "deny" || v?.toLowerCase() === "sameorigin",
      tip:    "Add: X-Frame-Options: SAMEORIGIN",
    },
    {
      header: "x-content-type-options",
      label:  "X-Content-Type-Options",
      pass:   (v) => v?.toLowerCase() === "nosniff",
      tip:    "Add: X-Content-Type-Options: nosniff",
    },
    {
      header: "referrer-policy",
      label:  "Referrer-Policy",
      pass:   (v) => !!v,
      tip:    "Add: Referrer-Policy: strict-origin-when-cross-origin",
    },
    {
      header: "permissions-policy",
      label:  "Permissions-Policy",
      pass:   (v) => !!v,
      tip:    "Add a Permissions-Policy header to restrict browser feature access.",
    },
  ];

  return checks.map((c) => ({
    ...c,
    value: headers[c.header],
    result: c.pass(headers[c.header]),
  }));
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    const ok = await copyToClipboard(text);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }
  return (
    <button onClick={handle} disabled={!text} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 cursor-pointer text-gray-600 rounded-lg transition-colors">
      {copied ? <span className="text-green-600">Copied!</span> : "Copy"}
    </button>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function HttpHeaderChecker() {
  const [url,     setUrl]     = useState("");
  const [headers, setHeaders] = useState(null);
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState("all"); // all | content | caching | security | server

  async function handleCheck() {
    const trimmed = url.trim();
    if (!trimmed) return;

    // Add protocol if missing
    const target = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    setLoading(true);
    setError(null);
    setHeaders(null);
    setStatus(null);

    try {
      // Use allorigins proxy to bypass CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });

      if (!res.ok) throw new Error(`Proxy error: ${res.status}`);

      const data = await res.json();

      // allorigins returns status in content_type field and sets its own headers
      // We fetch the actual headers separately using a HEAD request via the proxy
      // Since direct HEAD is blocked, we show allorigins proxy headers as a fallback
      // but also try a direct fetch with mode:no-cors for status info

      const headersObj = {};
      res.headers.forEach((val, key) => {
        headersObj[key.toLowerCase()] = val;
      });

      // Try direct fetch for actual response headers (may be blocked by CORS)
      let actualHeaders = {};
      let actualStatus  = null;

      try {
        const directRes = await fetch(target, {
          method:  "HEAD",
          mode:    "no-cors",
          signal:  AbortSignal.timeout(5000),
        });
        // no-cors mode — headers are opaque, but at least we know it's reachable
        actualStatus = directRes.status || 200;
      } catch {
        // Expected — try GET with cors
        try {
          const corsRes = await fetch(target, {
            method:  "GET",
            mode:    "cors",
            signal:  AbortSignal.timeout(5000),
          });
          actualStatus = corsRes.status;
          corsRes.headers.forEach((val, key) => {
            actualHeaders[key.toLowerCase()] = val;
          });
        } catch {
          // CORS blocked — show proxy headers
          actualHeaders = headersObj;
          actualStatus  = data.status?.http_code || 200;
        }
      }

      const merged = { ...headersObj, ...actualHeaders };

      if (Object.keys(merged).length === 0) {
        throw new Error("No headers retrieved. The server may be blocking cross-origin requests.");
      }

      setHeaders(merged);
      setStatus(actualStatus || data.status?.http_code);
    } catch (e) {
      if (e.name === "TimeoutError") {
        setError("Request timed out after 10 seconds.");
      } else {
        setError(e.message || "Failed to fetch headers.");
      }
    } finally {
      setLoading(false);
    }
  }

  const securityChecks = headers ? gradeHeaders(headers) : null;
  const score = securityChecks
    ? Math.round(securityChecks.filter((c) => c.result).length / securityChecks.length * 100)
    : null;

  const filteredHeaders = headers
    ? Object.entries(headers).filter(([k]) => {
        if (filter === "all") return true;
        const info = HEADER_INFO[k];
        return info?.category === filter;
      })
    : [];

  const statusColor =
    !status     ? "text-gray-500" :
    status < 300 ? "text-green-600" :
    status < 400 ? "text-blue-600"  :
    status < 500 ? "text-amber-600" :
                   "text-red-600";

  return (
    <div className="space-y-5">

      {/* ── URL input ─────────────────────────────────────────── */}
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          placeholder="example.com or https://example.com"
          spellCheck={false}
          className="flex-1 px-4 py-3 text-sm font-mono bg-white border-2 border-gray-200 focus:border-blue-400 rounded-xl outline-none transition-colors placeholder:text-gray-300 placeholder:font-sans"
        />
        <button
          onClick={handleCheck}
          disabled={loading || !url.trim()}
          className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl cursor-pointer transition-all"
        >
          {loading ? (
            <svg width="14" height="14" className="animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          {loading ? "Checking…" : "Check"}
        </button>
      </div>

      {/* ── Note ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
        <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-amber-700 leading-relaxed">
          Browsers block direct cross-origin header inspection. This tool uses a CORS proxy
          and a direct CORS fetch to retrieve as many real headers as possible.
          Some headers may be unavailable depending on the server's CORS policy.
        </p>
      </div>

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────── */}
      {headers && (
        <div className="space-y-4">

          {/* Status + score */}
          <div className="flex flex-wrap items-center gap-3">
            {status && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                <span className="text-xs text-gray-500 font-medium">HTTP status:</span>
                <span className={`text-sm font-bold font-mono ${statusColor}`}>{status}</span>
              </div>
            )}
            {score !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                score >= 80 ? "bg-green-50 border-green-200" :
                score >= 50 ? "bg-amber-50 border-amber-200" :
                              "bg-red-50 border-red-200"
              }`}>
                <span className="text-xs font-medium text-gray-600">Security score:</span>
                <span className={`text-sm font-bold font-mono ${
                  score >= 80 ? "text-green-700" : score >= 50 ? "text-amber-700" : "text-red-700"
                }`}>{score}/100</span>
              </div>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {Object.keys(headers).length} headers
            </span>
          </div>

          {/* Security checks */}
          {securityChecks && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Security headers
                </span>
              </div>
              <div className="divide-y divide-gray-100 bg-white">
                {securityChecks.map((c) => (
                  <div key={c.header} className="flex items-start gap-3 px-4 py-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      c.result ? "bg-green-100" : "bg-red-100"
                    }`}>
                      {c.result ? (
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
                      <p className={`text-xs font-bold ${c.result ? "text-green-700" : "text-gray-700"}`}>
                        {c.label}
                      </p>
                      {c.result ? (
                        <code className="text-xs font-mono text-gray-500 break-all">{c.value}</code>
                      ) : (
                        <p className="text-xs text-red-600 mt-0.5">{c.tip}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {["all","content","caching","security","server"].map((f) => {
              const count = f === "all"
                ? Object.keys(headers).length
                : Object.keys(headers).filter((k) => HEADER_INFO[k]?.category === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors capitalize ${
                    filter === f
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {f} ({count})
                </button>
              );
            })}
          </div>

          {/* Header list */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-100 bg-white">
              {filteredHeaders.length > 0 ? filteredHeaders.map(([key, val]) => {
                const info = HEADER_INFO[key];
                return (
                  <div key={key} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono font-bold text-gray-800">{key}</code>
                        {info && (
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                            CATEGORY_COLORS[info.category]
                          }`}>
                            {info.category}
                          </span>
                        )}
                      </div>
                      <CopyButton text={val} />
                    </div>
                    <code className="text-xs font-mono text-gray-600 break-all block">{val}</code>
                    {info && (
                      <p className="text-xs text-gray-400 mt-1">{info.desc}</p>
                    )}
                  </div>
                );
              }) : (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No headers in this category
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!headers && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-14 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-3">
        <svg width="48" height="48" fill="none" stroke="currentColor" className="text-gray-300" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
    </svg>
          <p className="text-sm font-semibold text-gray-400">
            Enter a URL to inspect its HTTP headers
          </p>
        </div>
      )}
    </div>
  );
}