"use client";

import { useState, useEffect } from "react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// TIMESTAMP CONVERTER
// Unix timestamp ↔ human date, multiple formats
// ============================================================

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    const ok = await copyToClipboard(text);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }
  return (
    <button
      onClick={handle}
      disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors"
    >
      {copied
        ? <>
            <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7"/>
            </svg>
            <span className="text-green-600">Copied!</span>
          </>
        : <>
            <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            Copy
          </>
      }
    </button>
  );
}

function ResultRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
      <span className="text-xs font-semibold text-gray-400 w-36 flex-shrink-0">{label}</span>
      <code className="text-xs font-mono text-gray-800 flex-1 break-all">{value}</code>
      <CopyButton text={value} />
    </div>
  );
}

function fromTimestamp(ts, unit) {
  const ms = unit === "ms" ? ts : unit === "μs" ? Math.floor(ts / 1000) : ts * 1000;
  return new Date(ms);
}

function formatAll(date) {
  if (!date || isNaN(date.getTime())) return null;

  const ts  = Math.floor(date.getTime() / 1000);
  const ms  = date.getTime();
  const μs  = ms * 1000;

  return [
    { label: "Unix (seconds)",      value: String(ts)                           },
    { label: "Unix (milliseconds)", value: String(ms)                           },
    { label: "Unix (microseconds)", value: String(μs)                           },
    { label: "ISO 8601 (UTC)",      value: date.toISOString()                   },
    { label: "ISO 8601 (local)",    value: date.toISOString().replace("Z", formatTzOffset(date)) },
    { label: "UTC string",          value: date.toUTCString()                   },
    { label: "Local string",        value: date.toLocaleString()                },
    { label: "Date only",           value: date.toISOString().slice(0, 10)      },
    { label: "Time only (UTC)",     value: date.toISOString().slice(11, 19)     },
    { label: "RFC 2822",            value: date.toUTCString()                   },
    { label: "Relative",            value: relative(date)                       },
    { label: "Day of week",         value: date.toLocaleDateString("en-US", { weekday: "long" }) },
    { label: "Week of year",        value: `Week ${weekNumber(date)}`           },
    { label: "Quarter",             value: `Q${Math.ceil((date.getUTCMonth() + 1) / 3)}` },
  ];
}

function formatTzOffset(date) {
  const off = -date.getTimezoneOffset();
  const h   = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const m   = String(Math.abs(off) % 60).padStart(2, "0");
  return `${off >= 0 ? "+" : "-"}${h}:${m}`;
}

function relative(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  const abs  = Math.abs(diff);
  const past = diff >= 0;

  if (abs < 60)    return past ? `${abs} seconds ago` : `in ${abs} seconds`;
  if (abs < 3600)  { const m = Math.floor(abs/60);    return past ? `${m} minute${m!==1?"s":""} ago`  : `in ${m} minute${m!==1?"s":""}`;  }
  if (abs < 86400) { const h = Math.floor(abs/3600);  return past ? `${h} hour${h!==1?"s":""} ago`    : `in ${h} hour${h!==1?"s":""}`;    }
  if (abs < 2592000){ const d = Math.floor(abs/86400); return past ? `${d} day${d!==1?"s":""} ago`    : `in ${d} day${d!==1?"s":""}`;     }
  if (abs < 31536000){ const mo = Math.floor(abs/2592000); return past ? `${mo} month${mo!==1?"s":""} ago` : `in ${mo} month${mo!==1?"s":""}`;  }
  const y = Math.floor(abs/31536000);
  return past ? `${y} year${y!==1?"s":""} ago` : `in ${y} year${y!==1?"s":""}`;
}

function weekNumber(date) {
  const d   = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - year) / 86400000) + 1) / 7);
}

function tryParseInput(raw, unit) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Pure number → unix timestamp
  if (/^-?\d+$/.test(trimmed)) {
    const n = parseInt(trimmed);
    return fromTimestamp(n, unit);
  }

  // Try natural date parse
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;

  return null;
}

// ── Current time ticker ───────────────────────────────────────
function CurrentTime() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {[
        { label: "Unix (s)",  value: Math.floor(now.getTime() / 1000) },
        { label: "Unix (ms)", value: now.getTime()                     },
        { label: "ISO 8601",  value: now.toISOString()                 },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
          <div>
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <code className="text-sm font-mono font-bold text-gray-800">{value}</code>
          </div>
          <CopyButton text={String(value)} />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TimestampConverter() {
  const [input,  setInput]  = useState("");
  const [unit,   setUnit]   = useState("s"); // s | ms | μs
  const [result, setResult] = useState(null);
  const [error,  setError]  = useState(null);

  // ── Convert on input change ───────────────────────────────────
  useEffect(() => {
    if (!input.trim()) {
      setResult(null);
      setError(null);
      return;
    }

    const date = tryParseInput(input, unit);
    if (date) {
      setResult(formatAll(date));
      setError(null);
    } else {
      setResult(null);
      setError("Could not parse this input. Try a Unix timestamp or an ISO 8601 date string.");
    }
  }, [input, unit]);

  function useNow() {
    setInput(String(Math.floor(Date.now() / 1000)));
    setUnit("s");
  }

  return (
    <div className="space-y-5">

      {/* ── Live clock ───────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" fill="currentColor" className="text-gray-500" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Current time
            </p>
          </div>
          <button
            onClick={useNow}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 cursor-pointer transition-colors flex items-center gap-1"
          >
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 8l4 4H3l4-4"/>
            </svg>
            Use now
          </button>
        </div>
        <CurrentTime />
      </div>

      {/* ── Input ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" fill="currentColor" className="text-gray-500" viewBox="0 0 24 24">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Convert a timestamp or date
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="1710892800  or  2024-03-20T00:00:00Z  or  March 20 2024"
            spellCheck={false}
            className={`flex-1 px-4 py-3 text-sm font-mono bg-white border-2 rounded-xl outline-none transition-colors ${
              error       ? "border-red-300"   :
              result      ? "border-green-300"  :
                            "border-gray-200 focus:border-blue-400"
            }`}
          />

          {/* Unit selector — only relevant for pure numbers */}
          <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 border border-gray-200 rounded-xl flex-shrink-0">
            {["s","ms","μs"].map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                title={u === "s" ? "Seconds" : u === "ms" ? "Milliseconds" : "Microseconds"}
                className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  unit === u
                    ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Quick samples */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-400 self-center">Try:</span>
          {[
            { label: "Now",       value: () => String(Math.floor(Date.now() / 1000)) },
            { label: "0",         value: () => "0"          },
            { label: "Y2K",       value: () => "946684800"  },
            { label: "2038 bug",  value: () => "2147483647" },
            { label: "ISO",       value: () => new Date().toISOString() },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => { setInput(value()); setUnit("s"); }}
              className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 cursor-pointer transition-colors flex items-center gap-1"
              title={label}
            >
              <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4"/>
              </svg>
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* ── Results ──────────────────────────────────────────── */}
      {result && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <svg width="14" height="14" fill="currentColor" className="text-gray-500" viewBox="0 0 24 24">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Converted formats
            </span>
          </div>
          <div className="bg-white divide-y divide-gray-100">
            {result.map(({ label, value }) => (
              <ResultRow key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!input && (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-3">
          <svg width="48" height="48" fill="none" stroke="currentColor" className="text-gray-300" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm font-semibold text-gray-400">
            Enter a timestamp or date string above
          </p>
        </div>
      )}
    </div>
  );
}