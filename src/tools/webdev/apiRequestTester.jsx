"use client";

import { useState, useRef } from "react";
import { AlertCircle, Send, Loader2, Signal } from "lucide-react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// API REQUEST TESTER
// Simple HTTP client — method, URL, headers, body, response
// ============================================================

const METHODS = ["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"];

const CONTENT_TYPES = [
  { label: "JSON",          value: "application/json"                  },
  { label: "Form URL",      value: "application/x-www-form-urlencoded" },
  { label: "Plain text",    value: "text/plain"                        },
  { label: "XML",           value: "application/xml"                   },
  { label: "None",          value: ""                                  },
];

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    const ok = await copyToClipboard(text);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }
  return (
    <button onClick={handle} disabled={!text} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 cursor-pointer text-gray-700 rounded-lg transition-colors">
      {copied ? <span className="text-green-600">Copied!</span> : label}
    </button>
  );
}

function HeaderRow({ header, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={header.key}
        onChange={(e) => onUpdate({ ...header, key: e.target.value })}
        placeholder="Header name"
        spellCheck={false}
        className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 transition-colors placeholder:text-gray-300"
      />
      <input
        type="text"
        value={header.value}
        onChange={(e) => onUpdate({ ...header, value: e.target.value })}
        placeholder="Value"
        spellCheck={false}
        className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 transition-colors placeholder:text-gray-300"
      />
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-red-500 cursor-pointer text-lg leading-none flex-shrink-0 px-1 transition-colors"
      >
        ×
      </button>
    </div>
  );
}

function formatBody(text, contentType) {
  if (!text) return "";
  if (contentType.includes("json")) {
    try { return JSON.stringify(JSON.parse(text), null, 2); }
    catch { return text; }
  }
  return text;
}

function getStatusColor(status) {
  if (!status)   return "text-gray-500 bg-gray-50 border-gray-200";
  if (status < 300) return "text-green-700 bg-green-50 border-green-200";
  if (status < 400) return "text-blue-700 bg-blue-50 border-blue-200";
  if (status < 500) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ApiRequestTester() {
  const [method,      setMethod]      = useState("GET");
  const [url,         setUrl]         = useState("");
  const [headers,     setHeaders]     = useState([{ id: 1, key: "Accept", value: "application/json" }]);
  const [body,        setBody]        = useState("");
  const [contentType, setContentType] = useState("application/json");
  const [loading,     setLoading]     = useState(false);
  const [response,    setResponse]    = useState(null);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState("body");    // body | headers
  const [resTab,      setResTab]      = useState("body");    // body | headers
  const abortRef = useRef(null);

  function addHeader() {
    setHeaders((prev) => [...prev, { id: Date.now(), key: "", value: "" }]);
  }

  function updateHeader(id, updated) {
    setHeaders((prev) => prev.map((h) => h.id === id ? updated : h));
  }

  function removeHeader(id) {
    setHeaders((prev) => prev.filter((h) => h.id !== id));
  }

  async function handleSend() {
    const trimmed = url.trim();
    if (!trimmed) return;

    const target = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    // Abort previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setResponse(null);

    const start = performance.now();

    try {
      // Build headers object
      const reqHeaders = {};
      for (const h of headers) {
        if (h.key.trim()) reqHeaders[h.key.trim()] = h.value.trim();
      }
      if (contentType && body && method !== "GET" && method !== "HEAD") {
        reqHeaders["Content-Type"] = contentType;
      }

      const options = {
        method,
        headers: reqHeaders,
        signal:  abortRef.current.signal,
      };

      if (body.trim() && method !== "GET" && method !== "HEAD") {
        options.body = body;
      }

      const res  = await fetch(target, options);
      const time = Math.round(performance.now() - start);
      const text = await res.text();

      // Parse response headers
      const resHeaders = {};
      res.headers.forEach((val, key) => { resHeaders[key] = val; });

      const resContentType = res.headers.get("content-type") || "";
      const formatted      = resContentType.includes("json") ? formatBody(text, "json") : text;

      setResponse({
        status:      res.status,
        statusText:  res.statusText,
        headers:     resHeaders,
        body:        formatted,
        rawBody:     text,
        time,
        size:        new TextEncoder().encode(text).length,
      });
    } catch (e) {
      if (e.name === "AbortError") return;
      setError(
        e.message === "Failed to fetch"
          ? "Request failed. The server may be blocking cross-origin requests (CORS), or the URL is unreachable."
          : e.message
      );
    } finally {
      setLoading(false);
    }
  }

  function handleAbort() {
    abortRef.current?.abort();
    setLoading(false);
  }

  const hasBody = method !== "GET" && method !== "HEAD";

  return (
    <div className="space-y-4">

      {/* ── Method + URL ──────────────────────────────────────── */}
      <div className="flex gap-2">
        {/* Method */}
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="px-3 py-3 text-sm font-bold bg-white border-2 border-gray-200 rounded-xl outline-none focus:border-blue-400 cursor-pointer transition-colors text-blue-700"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* URL */}
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="https://api.example.com/endpoint"
          spellCheck={false}
          className="flex-1 px-4 py-3 text-sm font-mono bg-white border-2 border-gray-200 focus:border-blue-400 rounded-xl outline-none transition-colors placeholder:text-gray-300 placeholder:font-sans"
        />

        {/* Send / Abort */}
        {loading ? (
          <button
            onClick={handleAbort}
            className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors flex-shrink-0"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!url.trim()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl cursor-pointer transition-all flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        )}
      </div>

      {/* ── Request tabs ──────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          {(hasBody ? ["headers","body"] : ["headers"]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-semibold capitalize cursor-pointer transition-colors border-b-2 ${
                activeTab === tab
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab}
              {tab === "headers" && (
                <span className="ml-1.5 text-xs text-gray-400">
                  ({headers.filter((h) => h.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 bg-white">
          {/* Headers tab */}
          {activeTab === "headers" && (
            <div className="space-y-2">
              {headers.map((h) => (
                <HeaderRow
                  key={h.id}
                  header={h}
                  onUpdate={(updated) => updateHeader(h.id, updated)}
                  onRemove={() => removeHeader(h.id)}
                />
              ))}
              <button
                onClick={addHeader}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer transition-colors mt-1"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add header
              </button>
            </div>
          )}

          {/* Body tab */}
          {activeTab === "body" && hasBody && (
            <div className="space-y-3">
              {/* Content-Type */}
              <div className="flex flex-wrap gap-1.5">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setContentType(ct.value)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                      contentType === ct.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  contentType.includes("json")
                    ? '{\n  "key": "value"\n}'
                    : contentType.includes("form")
                    ? "key=value&another=param"
                    : "Request body…"
                }
                spellCheck={false}
                className="w-full px-4 py-3 text-sm font-mono bg-gray-50 border border-gray-200 rounded-xl outline-none resize-none min-h-[160px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
          <p className="text-sm font-medium text-blue-700">Sending request…</p>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500" />
          <p className="text-xs text-red-700 leading-relaxed">{error}</p>
        </div>
      )}

      {/* ── Response ──────────────────────────────────────────── */}
      {response && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">

          {/* Response meta */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <span className={`px-3 py-1 text-sm font-bold font-mono rounded-lg border ${getStatusColor(response.status)}`}>
              {response.status} {response.statusText}
            </span>
            <span className="text-xs text-gray-500">
              {response.time}ms
            </span>
            <span className="text-xs text-gray-500">
              {response.size < 1024
                ? `${response.size} B`
                : `${(response.size / 1024).toFixed(1)} KB`}
            </span>
            <div className="ml-auto">
              <CopyButton text={response.rawBody} label="Copy body" />
            </div>
          </div>

          {/* Response tabs */}
          <div className="flex border-b border-gray-200 bg-white">
            {["body","headers"].map((tab) => (
              <button
                key={tab}
                onClick={() => setResTab(tab)}
                className={`px-4 py-2.5 text-xs font-semibold capitalize cursor-pointer transition-colors border-b-2 ${
                  resTab === tab
                    ? "border-blue-600 text-blue-700 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab}
                {tab === "headers" && (
                  <span className="ml-1.5 text-xs text-gray-400">
                    ({Object.keys(response.headers).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Body */}
          {resTab === "body" && (
            <div className="bg-gray-900 overflow-auto max-h-[500px]">
              {response.body ? (
                <pre className="px-4 py-4 text-xs font-mono text-gray-200 whitespace-pre-wrap break-all leading-relaxed">
                  {response.body}
                </pre>
              ) : (
                <div className="px-4 py-8 text-center text-xs text-gray-500">
                  Empty response body
                </div>
              )}
            </div>
          )}

          {/* Response headers */}
          {resTab === "headers" && (
            <div className="bg-white divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {Object.entries(response.headers).map(([key, val]) => (
                <div key={key} className="flex items-start gap-4 px-4 py-2.5 hover:bg-gray-50">
                  <code className="text-xs font-mono font-bold text-gray-700 w-40 flex-shrink-0">{key}</code>
                  <code className="text-xs font-mono text-gray-500 flex-1 break-all">{val}</code>
                  <CopyButton text={val} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!response && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-14 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-3">
          <Signal className="w-16 h-16 opacity-20" />
          <p className="text-sm font-semibold text-gray-400">
            Enter a URL and hit Send to make a request
          </p>
          <p className="text-xs text-gray-300">Supports GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS</p>
        </div>
      )}
    </div>
  );
}