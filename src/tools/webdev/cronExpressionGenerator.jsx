"use client";

import { useState, useEffect } from "react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// CRON EXPRESSION GENERATOR + PARSER
// Standard 5-field cron: min hour dom month dow
// ============================================================

// ── Parser: expression → human description ───────────────────
function parseCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [min, hour, dom, month, dow] = parts;

  try {
    // Validate each field
    validateField(min,   0, 59, "minute");
    validateField(hour,  0, 23, "hour");
    validateField(dom,   1, 31, "day-of-month");
    validateField(month, 1, 12, "month");
    validateField(dow,   0,  7, "day-of-week");

    const desc = buildDescription(min, hour, dom, month, dow);
    const next  = nextRuns(expr, 5);

    return { valid: true, desc, next, parts: { min, hour, dom, month, dow } };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

function validateField(val, min, max, name) {
  if (val === "*") return;
  if (val === "?") return;

  // Step: */n
  if (/^\*\/\d+$/.test(val)) {
    const step = parseInt(val.split("/")[1]);
    if (step < 1) throw new Error(`Invalid step in ${name}`);
    return;
  }

  // Range: n-m
  if (/^\d+-\d+$/.test(val)) {
    const [a, b] = val.split("-").map(Number);
    if (a < min || b > max || a > b) throw new Error(`Range out of bounds in ${name}`);
    return;
  }

  // Range with step: n-m/s
  if (/^\d+-\d+\/\d+$/.test(val)) return;

  // List: n,m,o
  if (/^[\d,]+$/.test(val)) {
    const nums = val.split(",").map(Number);
    for (const n of nums) {
      if (n < min || n > max) throw new Error(`Value ${n} out of range [${min}-${max}] in ${name}`);
    }
    return;
  }

  // Single number
  if (/^\d+$/.test(val)) {
    const n = parseInt(val);
    if (n < min || n > max) throw new Error(`Value ${n} out of range [${min}-${max}] in ${name}`);
    return;
  }

  throw new Error(`Invalid value "${val}" in ${name}`);
}

const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function fieldToHuman(val, type) {
  if (val === "*" || val === "?") return null; // "every X"

  if (/^\*\/(\d+)$/.test(val)) {
    const step = val.match(/\*\/(\d+)/)[1];
    const unit = type === "min" ? "minute" : type === "hour" ? "hour" :
                 type === "dom" ? "day" : type === "month" ? "month" : "day-of-week";
    return `every ${step} ${unit}${step !== "1" ? "s" : ""}`;
  }

  if (/^\d+-\d+$/.test(val)) {
    const [a, b] = val.split("-");
    if (type === "month") return `${MONTH_NAMES[a]}–${MONTH_NAMES[b]}`;
    if (type === "dow")   return `${DOW_NAMES[a]}–${DOW_NAMES[b]}`;
    return `${a}–${b}`;
  }

  if (/^[\d,]+$/.test(val)) {
    const nums = val.split(",");
    if (type === "month") return nums.map((n) => MONTH_NAMES[n]).join(", ");
    if (type === "dow")   return nums.map((n) => DOW_NAMES[n]).join(", ");
    return nums.join(", ");
  }

  if (type === "month") return MONTH_NAMES[val] || val;
  if (type === "dow")   return DOW_NAMES[val]   || val;
  return val;
}

function buildDescription(min, hour, dom, month, dow) {
  const parts = [];

  // Time
  if (min === "*" && hour === "*") {
    parts.push("every minute");
  } else if (min === "0" && hour === "*") {
    parts.push("every hour");
  } else if (/^\*\/(\d+)$/.test(min) && hour === "*") {
    const step = min.match(/\*\/(\d+)/)[1];
    parts.push(`every ${step} minute${step !== "1" ? "s" : ""}`);
  } else if (/^\*\/(\d+)$/.test(hour) && min === "0") {
    const step = hour.match(/\*\/(\d+)/)[1];
    parts.push(`every ${step} hour${step !== "1" ? "s" : ""}`);
  } else {
    const h = fieldToHuman(hour, "hour");
    const m = fieldToHuman(min,  "min");
    if (h && m)   parts.push(`at ${h.includes("every") ? h : `hour${hour.includes(",") ? "s" : ""} ${h}`}, minute ${m}`);
    else if (h)   parts.push(`every minute of hour${hour.includes(",") ? "s" : ""} ${h}`);
    else if (m)   parts.push(`at minute ${m} of every hour`);
    else {
      // Both specific
      const hVal  = parseInt(hour);
      const mVal  = parseInt(min);
      const ampm  = hVal < 12 ? "AM" : "PM";
      const h12   = hVal % 12 === 0 ? 12 : hVal % 12;
      const mPad  = String(mVal).padStart(2, "0");
      parts.push(`at ${h12}:${mPad} ${ampm}`);
    }
  }

  // Day of month
  if (dom !== "*" && dom !== "?") {
    const d = fieldToHuman(dom, "dom");
    parts.push(`on day${dom.includes(",") ? "s" : ""} ${d} of the month`);
  }

  // Month
  if (month !== "*") {
    const mo = fieldToHuman(month, "month");
    parts.push(`in ${mo}`);
  }

  // Day of week
  if (dow !== "*" && dow !== "?") {
    const d = fieldToHuman(dow, "dow");
    parts.push(`on ${d}`);
  }

  return parts.join(", ");
}

// ── Next runs calculator ──────────────────────────────────────
function nextRuns(expr, count = 5) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return [];

  const [minF, hourF, domF, monthF, dowF] = parts;

  function matches(val, n, min, max) {
    if (val === "*" || val === "?") return true;
    if (/^\*\/(\d+)$/.test(val)) {
      return n % parseInt(val.split("/")[1]) === 0;
    }
    if (/^\d+-\d+$/.test(val)) {
      const [a, b] = val.split("-").map(Number);
      return n >= a && n <= b;
    }
    if (/^[\d,]+$/.test(val)) {
      return val.split(",").map(Number).includes(n);
    }
    if (/^\d+$/.test(val)) return parseInt(val) === n;
    return false;
  }

  const results = [];
  const start   = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);

  let d = new Date(start);
  let attempts = 0;
  const MAX    = 200000;

  while (results.length < count && attempts < MAX) {
    attempts++;

    const mo  = d.getMonth() + 1;
    const dom = d.getDate();
    const dow = d.getDay();
    const hr  = d.getHours();
    const mn  = d.getMinutes();

    if (matches(monthF, mo,  1, 12) &&
        matches(domF,   dom, 1, 31) &&
        matches(dowF,   dow, 0,  7) &&
        matches(hourF,  hr,  0, 23) &&
        matches(minF,   mn,  0, 59)) {
      results.push(new Date(d));
      d.setMinutes(d.getMinutes() + 1);
    } else {
      d.setMinutes(d.getMinutes() + 1);
    }
  }

  return results;
}

// ── Presets ───────────────────────────────────────────────────
const PRESETS = [
  { label: "Every minute",      expr: "* * * * *"    },
  { label: "Every 5 minutes",   expr: "*/5 * * * *"  },
  { label: "Every 15 minutes",  expr: "*/15 * * * *" },
  { label: "Every 30 minutes",  expr: "*/30 * * * *" },
  { label: "Every hour",        expr: "0 * * * *"    },
  { label: "Every 6 hours",     expr: "0 */6 * * *"  },
  { label: "Every day midnight",expr: "0 0 * * *"    },
  { label: "Every day noon",    expr: "0 12 * * *"   },
  { label: "Every weekday 9am", expr: "0 9 * * 1-5"  },
  { label: "Every Monday",      expr: "0 0 * * 1"    },
  { label: "Every Sunday",      expr: "0 0 * * 0"    },
  { label: "1st of month",      expr: "0 0 1 * *"    },
  { label: "Every quarter",     expr: "0 0 1 */3 *"  },
  { label: "Every year Jan 1",  expr: "0 0 1 1 *"    },
];

// ── Field builder ─────────────────────────────────────────────
function FieldBuilder({ label, field, value, onChange, min, max, names }) {
  const [mode, setMode] = useState("every"); // every | specific | range | step

  // Sync mode from value
  useEffect(() => {
    if (value === "*")              setMode("every");
    else if (/^\*\/\d+$/.test(value)) setMode("step");
    else if (/^\d+-\d+$/.test(value)) setMode("range");
    else                            setMode("specific");
  }, [value]);

  function setEvery()    { onChange("*"); }
  function setStep(n)    { onChange(`*/${n}`); }
  function setSpecific(v){ onChange(v); }
  function setRange(a,b) { onChange(`${a}-${b}`); }

  const step = value.startsWith("*/") ? parseInt(value.slice(2)) : 1;
  const [rangeA, rangeB] = value.includes("-")
    ? value.split("-").map(Number)
    : [min, max];
  const specific = /^\d+$/.test(value) ? parseInt(value) : min;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</span>
        <code className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          {value}
        </code>
      </div>
      <div className="p-3 space-y-3">
        {/* Mode selector */}
        <div className="flex gap-1 flex-wrap">
          {["every","step","range","specific"].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                if (m === "every")    setEvery();
                if (m === "step")     setStep(1);
                if (m === "range")    setRange(min, max);
                if (m === "specific") setSpecific(min);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border cursor-pointer transition-all flex items-center gap-1 ${
                mode === m
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {m === "every" ? (
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ) : m === "step" ? (
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14M4 9h4m8 0h4M4 15h4m8 0h4"/></svg>
              ) : m === "range" ? (
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M3 12h18M12 3v18"/></svg>
              ) : (
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              )}
              {m === "every" ? "Every" : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Controls */}
        {mode === "step" && (
          <div className="flex items-center gap-2">
            <svg width="12" height="12" fill="currentColor" className="text-gray-500" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <input
              type="number"
              min={1}
              max={max - min}
              value={step}
              onChange={(e) => setStep(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1.5 text-xs font-mono text-center bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400"
            />
            <span className="text-xs text-gray-500">{label.toLowerCase()}{step !== 1 ? "s" : ""}</span>
          </div>
        )}

        {mode === "range" && (
          <div className="flex items-center gap-2 flex-wrap">
            <svg width="12" height="12" fill="currentColor" className="text-gray-500" viewBox="0 0 24 24">
              <path d="M11 17H6.5a1.5 1.5 0 0 1 0-3H11m4.5 0h-4.5a1.5 1.5 0 0 1 0-3h4.5a1.5 1.5 0 0 1 0 3z"/>
            </svg>
            <input
              type="number"
              min={min} max={max}
              value={rangeA}
              onChange={(e) => setRange(parseInt(e.target.value) || min, rangeB)}
              className="w-16 px-2 py-1.5 text-xs font-mono text-center bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400"
            />
            <svg width="12" height="12" fill="currentColor" className="text-gray-500" viewBox="0 0 24 24">
              <path d="M6 9l6 6 6-6"/>
            </svg>
            <input
              type="number"
              min={min} max={max}
              value={rangeB}
              onChange={(e) => setRange(rangeA, parseInt(e.target.value) || max)}
              className="w-16 px-2 py-1.5 text-xs font-mono text-center bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400"
            />
          </div>
        )}

        {mode === "specific" && (
          names ? (
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => {
                const selected = value.split(",").includes(String(n));
                return (
                  <button
                    key={n}
                    onClick={() => {
                      const current = value === "*" || value.startsWith("*/") || value.includes("-")
                        ? []
                        : value.split(",").filter(Boolean);
                      const updated = selected
                        ? current.filter((v) => v !== String(n))
                        : [...current, String(n)].sort((a, b) => a - b);
                      setSpecific(updated.length ? updated.join(",") : String(min));
                    }}
                    className={`px-2 py-1 text-xs font-semibold rounded-lg border cursor-pointer transition-all flex items-center gap-1 ${
                      selected
                        ?                        "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {names[n]}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg width="12" height="12" fill="currentColor" className="text-gray-500" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <input
                type="number"
                min={min}
                max={max}
                value={specific}
                onChange={(e) => setSpecific(String(Math.min(max, Math.max(min, parseInt(e.target.value) || min))))}
                className="flex-1 px-2 py-1.5 text-xs font-mono text-center bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400"
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CronExpressionGenerator() {
  const [expr,   setExpr]   = useState("0 9 * * 1-5");
  const [parsed, setParsed] = useState(null);
  const [copied, setCopied] = useState(false);

  // Field state
  const [fields, setFields] = useState({
    min: "0", hour: "9", dom: "*", month: "*", dow: "1-5",
  });

  // ── Sync fields → expression ──────────────────────────────────
  useEffect(() => {
    const e = `${fields.min} ${fields.hour} ${fields.dom} ${fields.month} ${fields.dow}`;
    setExpr(e);
  }, [fields]);

  // ── Parse expression ──────────────────────────────────────────
  useEffect(() => {
    if (!expr.trim()) { setParsed(null); return; }
    const result = parseCron(expr);
    setParsed(result);
  }, [expr]);

  // ── Manual expression edit ────────────────────────────────────
  function handleExprChange(val) {
    setExpr(val);
    const parts = val.trim().split(/\s+/);
    if (parts.length === 5) {
      setFields({
        min:   parts[0],
        hour:  parts[1],
        dom:   parts[2],
        month: parts[3],
        dow:   parts[4],
      });
    }
  }

  function setField(key, val) {
    setFields((prev) => ({ ...prev, [key]: val }));
  }

  async function handleCopy() {
    const ok = await copyToClipboard(expr);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  function loadPreset(preset) {
    handleExprChange(preset.expr);
  }

  return (
    <div className="space-y-5">

      {/* ── Expression input ──────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className={`flex-1 flex items-center gap-3 px-4 py-3 bg-white border-2 rounded-xl transition-colors ${
            parsed?.valid === false ? "border-red-300" :
            parsed?.valid          ? "border-green-300":
                                     "border-gray-200"
          }`}>
            <svg width="14" height="14" fill="currentColor" className="text-gray-400 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            <input
              type="text"
              value={expr}
              onChange={(e) => handleExprChange(e.target.value)}
              spellCheck={false}
              className="flex-1 text-base font-mono font-bold text-blue-700 outline-none bg-transparent tracking-widest"
            />
            <svg width="14" height="14" fill="currentColor" className="text-gray-400 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer transition-colors flex-shrink-0"
            title="Copy to clipboard"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" className="flex-shrink-0">
              <path d="M8 5H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2m-4 4H6m10 0h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m-4 0H9"/>
            </svg>
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        {/* Field labels */}
        <div className="grid grid-cols-5 gap-1 px-1">
          {["Minute", "Hour", "Day", "Month", "Weekday"].map((l) => (
            <div key={l} className="text-center text-xs text-gray-400 font-medium flex items-center justify-center gap-1">
              <span>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Human description + error ─────────────────────────── */}
      {parsed && (
        parsed.valid ? (
          <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <svg width="15" height="15" className="flex-shrink-0 mt-0.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7"/>
            </svg>
            <p className="text-sm text-blue-700 font-medium capitalize">{parsed.desc}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <svg width="14" height="14" className="flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-xs text-red-700 font-medium">{parsed.error}</p>
          </div>
        )
      )}

      {/* ── Visual builder ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FieldBuilder
          label="Minute"
          field="min"
          value={fields.min}
          onChange={(v) => setField("min", v)}
          min={0} max={59}
        />
        <FieldBuilder
          label="Hour"
          field="hour"
          value={fields.hour}
          onChange={(v) => setField("hour", v)}
          min={0} max={23}
        />
        <FieldBuilder
          label="Day of Month"
          field="dom"
          value={fields.dom}
          onChange={(v) => setField("dom", v)}
          min={1} max={31}
        />
        <FieldBuilder
          label="Month"
          field="month"
          value={fields.month}
          onChange={(v) => setField("month", v)}
          min={1} max={12}
          names={MONTH_NAMES}
        />
        <FieldBuilder
          label="Day of Week"
          field="dow"
          value={fields.dow}
          onChange={(v) => setField("dow", v)}
          min={0} max={6}
          names={DOW_NAMES}
        />
      </div>

      {/* ── Presets ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" fill="currentColor" className="text-gray-500" viewBox="0 0 24 24">
            <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m-7 2v6"/>
          </svg>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Common schedules</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.expr}
              onClick={() => loadPreset(p)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                expr === p.expr
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
              title={p.expr}
            >
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5v14"/>
              </svg>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Next runs ─────────────────────────────────────────── */}
      {parsed?.valid && parsed.next?.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <svg width="14" height="14" fill="currentColor" className="text-gray-500" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Next {parsed.next.length} scheduled runs
            </span>
          </div>
          <div className="divide-y divide-gray-100 bg-white">
            {parsed.next.map((d, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-2.5">
                <svg width="12" height="12" fill="currentColor" className="text-gray-400 w-4 h-4" viewBox="0 0 24 24">
                  <circle cx="8" cy="12" r="7"/>
                  <polyline points="12.3,8.7 15,12 12.3,15.3"/>
                </svg>
                <code className="text-sm font-mono text-gray-700 flex-1">{d.toLocaleString()}</code>
                <span className="text-xs text-gray-400">{relative(d)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function relative(date) {
  const diff = Math.ceil((date.getTime() - Date.now()) / 1000);
  if (diff < 60)    return `in ${diff}s`;
  if (diff < 3600)  return `in ${Math.floor(diff/60)}m`;
  if (diff < 86400) return `in ${Math.floor(diff/3600)}h`;
  return `in ${Math.floor(diff/86400)}d`;
}