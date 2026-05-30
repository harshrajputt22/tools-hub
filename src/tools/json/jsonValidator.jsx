"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// PURE VALIDATION ENGINE — fully preserved
// ============================================================

function getLineCol(str, pos) {
  const before = str.slice(0, pos);
  const lines  = before.split("\n");
  return {
    line: lines.length,
    col:  lines[lines.length - 1].length + 1,
  };
}

function extractPosition(message) {
  const posMatch  = message.match(/position (\d+)/i);
  const lineMatch = message.match(/line (\d+) column (\d+)/i);
  if (lineMatch) {
    return { line: parseInt(lineMatch[1], 10), col: parseInt(lineMatch[2], 10), pos: null };
  }
  if (posMatch) {
    return { pos: parseInt(posMatch[1], 10), line: null, col: null };
  }
  return null;
}

function getHint(raw, errorMsg) {
  if (/'\s*:/m.test(raw) || /:\s*'/m.test(raw)) {
    return "Hint: JSON requires double quotes (\") not single quotes (').";
  }
  if (/,\s*[}\]]/m.test(raw)) {
    return "Hint: JSON does not allow trailing commas before } or ].";
  }
  if (/\/\//m.test(raw) || /\/\*/m.test(raw)) {
    return "Hint: JSON does not support comments. Remove // or /* */ comments.";
  }
  if (/\bundefined\b/m.test(raw)) {
    return "Hint: JSON does not support 'undefined'. Use null instead.";
  }
  if (/\bTrue\b|\bFalse\b|\bNone\b/m.test(raw)) {
    return "Hint: JSON booleans must be lowercase: true, false. Null must be null.";
  }
  if (/\bNaN\b|\bInfinity\b/m.test(raw)) {
    return "Hint: JSON does not support NaN or Infinity values.";
  }
  if (/\bfunction\b/m.test(raw)) {
    return "Hint: JSON does not support functions or methods.";
  }
  if (/=>/m.test(raw)) {
    return "Hint: JSON does not support arrow functions or expressions.";
  }
  if (/\d+\.\d+\.\d+/m.test(raw)) {
    return "Hint: Version strings like '1.0.0' must be quoted: \"1.0.0\".";
  }
  return null;
}

function findDuplicateKeys(raw) {
  const duplicates = [];
  const pattern    = /"([^"\\]|\\.)*"\s*:/g;
  const counts     = {};
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    const key  = match[0].replace(/\s*:$/, "").replace(/^"|"$/g, "");
    const line = raw.slice(0, match.index).split("\n").length;
    if (counts[key]) {
      duplicates.push({ key, line });
    } else {
      counts[key] = true;
    }
  }
  return duplicates;
}

function analyzeJson(val) {
  const counts = { strings: 0, numbers: 0, booleans: 0, nulls: 0, objects: 0, arrays: 0, total: 0 };
  function walk(v) {
    counts.total++;
    if (v === null)               { counts.nulls++;    return; }
    if (typeof v === "string")    { counts.strings++;  return; }
    if (typeof v === "number")    { counts.numbers++;  return; }
    if (typeof v === "boolean")   { counts.booleans++; return; }
    if (Array.isArray(v))         { counts.arrays++;   v.forEach(walk); return; }
    if (typeof v === "object")    { counts.objects++;  Object.values(v).forEach(walk); }
  }
  walk(val);
  return counts;
}

function getDepth(val, depth = 0) {
  if (typeof val !== "object" || val === null) return depth;
  const children = Array.isArray(val) ? val : Object.values(val);
  if (!children.length) return depth;
  return Math.max(...children.map((c) => getDepth(c, depth + 1)));
}

function countKeys(val, count = 0) {
  if (Array.isArray(val)) return val.reduce((c, v) => countKeys(v, c), count);
  if (val && typeof val === "object") {
    const keys = Object.keys(val);
    return keys.reduce((c, k) => countKeys(val[k], c + 1), count);
  }
  return count;
}

function validateJson(raw, options = {}) {
  const { checkDuplicates = true, strict = true } = options;
  const errors   = [];
  const warnings = [];
  const hints    = [];

  if (!raw.trim()) {
    return {
      valid: false,
      errors: [{ message: "Input is empty.", line: null, col: null }],
      warnings: [], hints: [], stats: null, parsed: null,
    };
  }

  // Pre-parse: trailing commas
  if (strict && /,\s*[}\]]/m.test(raw)) {
    const match = raw.match(/,\s*[}\]]/m);
    const idx   = raw.indexOf(match[0]);
    const { line, col } = getLineCol(raw, idx);
    errors.push({ message: "Trailing comma found — JSON does not allow trailing commas.", line, col });
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const msg = e.message || "Invalid JSON";
    const pos = extractPosition(msg);
    let line  = null, col = null;
    if (pos?.line)                            { line = pos.line; col = pos.col; }
    else if (pos?.pos !== null && pos?.pos !== undefined) {
      const lc = getLineCol(raw, pos.pos);
      line = lc.line; col = lc.col;
    }
    errors.push({ message: msg, line, col });
    const hint = getHint(raw, msg);
    if (hint) hints.push(hint);
    return {
      valid: false, errors, warnings, hints,
      stats: { inputLength: raw.length, inputLines: raw.split("\n").length },
      parsed: null,
    };
  }

  // Post-parse checks
  if (checkDuplicates) {
    const dupes = findDuplicateKeys(raw);
    dupes.forEach(({ key, line }) => {
      warnings.push({
        message: `Duplicate key "${key}" — last value wins. Consider deduplicating.`,
        line, col: null,
      });
    });
  }

  if (parsed === null) {
    warnings.push({ message: "Root value is null.", line: null, col: null });
  } else if (typeof parsed === "string") {
    warnings.push({ message: "Root value is a string — usually an object or array is expected.", line: null, col: null });
  } else if (typeof parsed === "number") {
    warnings.push({ message: "Root value is a number — usually an object or array is expected.", line: null, col: null });
  }

  const depth = getDepth(parsed);
  if (depth > 10) {
    warnings.push({
      message: `Deep nesting detected (${depth} levels). Consider flattening for better readability.`,
      line: null, col: null,
    });
  }

  const analysis = analyzeJson(parsed);
  const keyCount = countKeys(parsed);

  return {
    valid: errors.length === 0,
    errors, warnings, hints,
    stats: {
      inputLength: raw.length,
      inputLines:  raw.split("\n").length,
      depth, keyCount,
      rootType: Array.isArray(parsed) ? "array" : parsed === null ? "null" : typeof parsed,
      ...analysis,
    },
    parsed,
  };
}

// ============================================================
// UI SUB-COMPONENTS
// ============================================================

function LineNumbers({ text }) {
  const lines = text ? text.split("\n").length : 1;
  return (
    <div
      className="select-none text-right pr-3 pt-3.5 pb-3.5 text-xs font-mono text-gray-300 leading-relaxed bg-gray-50 border-r border-gray-200 min-w-[40px] rounded-bl-xl overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="leading-relaxed">{i + 1}</div>
      ))}
    </div>
  );
}

function StatusBadge({ valid, errorCount, warningCount }) {
  if (valid) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Valid JSON
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      {errorCount} Error{errorCount !== 1 ? "s" : ""}
      {warningCount > 0 && ` · ${warningCount} Warning${warningCount !== 1 ? "s" : ""}`}
    </span>
  );
}

function IssueRow({ type, message, line, col }) {
  const isError = type === "error";
  const isHint  = type === "hint";
  const styles  = {
    error:   "bg-red-50 border-red-200 border-l-red-500",
    warning: "bg-amber-50 border-amber-200 border-l-amber-500",
    hint:    "bg-blue-50 border-blue-200 border-l-blue-400",
  };
  const iconColor = { error: "text-red-500", warning: "text-amber-500", hint: "text-blue-500" };
  const textColor = { error: "text-red-700", warning: "text-amber-700", hint: "text-blue-700" };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border border-l-2 rounded-xl ${styles[type]}`}>
      <div className={`flex-shrink-0 mt-0.5 ${iconColor[type]}`}>
        {isError ? (
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : isHint ? (
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-mono leading-relaxed break-all ${textColor[type]}`}>{message}</p>
        {(line || col) && (
          <p className={`text-xs mt-1 font-semibold ${textColor[type]} opacity-70`}>
            Line {line ?? "?"}{col ? `, Column ${col}` : ""}
          </p>
        )}
      </div>
      <span className={`flex-shrink-0 text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${styles[type]} opacity-80`}>
        {type}
      </span>
    </div>
  );
}

function StatsGrid({ stats }) {
  if (!stats) return null;
  const items = [
    { label: "Size",     value: `${stats.inputLength?.toLocaleString()} chars`, color: "text-gray-700"   },
    { label: "Lines",    value: stats.inputLines?.toLocaleString(),              color: "text-gray-700"   },
    { label: "Depth",    value: stats.depth ?? 0,                                color: "text-indigo-600" },
    { label: "Keys",     value: stats.keyCount?.toLocaleString() ?? 0,          color: "text-purple-600" },
    { label: "Objects",  value: stats.objects ?? 0,                              color: "text-purple-600" },
    { label: "Arrays",   value: stats.arrays ?? 0,                              color: "text-orange-600" },
    { label: "Strings",  value: stats.strings ?? 0,                             color: "text-green-600"  },
    { label: "Numbers",  value: stats.numbers ?? 0,                             color: "text-blue-600"   },
    { label: "Booleans", value: stats.booleans ?? 0,                            color: "text-amber-600"  },
    { label: "Nulls",    value: stats.nulls ?? 0,                               color: "text-gray-500"   },
    {
      label: "Root type",
      value: stats.rootType ?? "—",
      color: stats.rootType === "array" ? "text-orange-600" : stats.rootType === "object" ? "text-purple-600" : "text-gray-600",
    },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {items.map(({ label, value, color }) => (
        <div key={label} className="flex flex-col gap-0.5 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
          <span className="text-xs text-gray-400 font-medium">{label}</span>
          <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function ResultHeader({ result }) {
  if (!result) return null;
  return (
    <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 ${
      result.valid ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
    }`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        result.valid ? "bg-green-100" : "bg-red-100"
      }`}>
        {result.valid ? (
          <svg width="18" height="18" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg width="18" height="18" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <div>
        <p className={`text-base font-bold ${result.valid ? "text-green-800" : "text-red-800"}`}>
          {result.valid ? "Valid JSON" : "Invalid JSON"}
        </p>
        <p className={`text-xs mt-0.5 ${result.valid ? "text-green-600" : "text-red-600"}`}>
          {result.valid
            ? `Parsed successfully${result.warnings.length > 0 ? ` with ${result.warnings.length} warning${result.warnings.length !== 1 ? "s" : ""}` : " — no issues found"}`
            : `${result.errors.length} error${result.errors.length !== 1 ? "s" : ""}${result.warnings.length > 0 ? ` · ${result.warnings.length} warning${result.warnings.length !== 1 ? "s" : ""}` : ""}`
          }
        </p>
      </div>
      {result.valid && result.stats?.rootType && (
        <span className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-green-200 text-green-700">
          {result.stats.rootType}
        </span>
      )}
    </div>
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
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 rounded-lg transition-colors"
    >
      {state === "copied" ? (
        <span className="text-green-600">Copied!</span>
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

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JsonValidator() {
  const [input,           setInput]           = useState("");
  const [result,          setResult]          = useState(null);
  const [autoValidate,    setAutoValidate]    = useState(true);
  const [checkDuplicates, setCheckDuplicates] = useState(true);
  const [strict,          setStrict]          = useState(true);
  const [activeTab,       setActiveTab]       = useState("issues");
  const textareaRef = useRef(null);

  const handleValidate = useCallback(() => {
    if (!input.trim()) { setResult(null); return; }
    const res = validateJson(input, { checkDuplicates, strict });
    setResult(res);
  }, [input, checkDuplicates, strict]);

  useEffect(() => {
    if (!autoValidate) return;
    const t = setTimeout(handleValidate, 350);
    return () => clearTimeout(t);
  }, [input, autoValidate, handleValidate]);

  useEffect(() => {
    if (input.trim()) handleValidate();
  }, [checkDuplicates, strict]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleValidate();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleValidate]);

  function handleClear() {
    setInput("");
    setResult(null);
  }

  const totalErrors   = result?.errors?.length   ?? 0;
  const totalWarnings = result?.warnings?.length ?? 0;
  const totalHints    = result?.hints?.length    ?? 0;
  const totalIssues   = totalErrors + totalWarnings + totalHints;

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">

        <button
          onClick={handleValidate}
          data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Validate JSON
        </button>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <button
            role="switch"
            aria-checked={autoValidate}
            onClick={() => setAutoValidate((v) => !v)}
            className={`relative w-8 h-4 rounded-full transition-colors ${autoValidate ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${autoValidate ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <span className="text-xs font-medium text-gray-600">Auto validate</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <button
            role="switch"
            aria-checked={checkDuplicates}
            onClick={() => setCheckDuplicates((v) => !v)}
            className={`relative w-8 h-4 rounded-full transition-colors ${checkDuplicates ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${checkDuplicates ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <span className="text-xs font-medium text-gray-600">Check duplicates</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <button
            role="switch"
            aria-checked={strict}
            onClick={() => setStrict((v) => !v)}
            className={`relative w-8 h-4 rounded-full transition-colors ${strict ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${strict ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <span className="text-xs font-medium text-gray-600">Strict mode</span>
        </label>

        {result && (
          <div className="ml-auto">
            <StatusBadge valid={result.valid} errorCount={totalErrors} warningCount={totalWarnings} />
          </div>
        )}
      </div>

      {/* ── Main layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">JSON Input</span>
              {input && (
                <span className="text-xs text-gray-400 tabular-nums">
                  {input.length.toLocaleString()} chars · {input.split("\n").length} lines
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {input && result && (
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${result.valid ? "bg-green-500" : "bg-red-500"}`} />
              )}
              <div className="flex items-center gap-1">
                {input && <CopyButton text={input} label="Copy input" />}
                {input && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={`flex-1 flex border border-t-0 rounded-b-xl overflow-hidden transition-colors ${
            result ? result.valid ? "border-green-300" : "border-red-300" : "border-gray-200"
          }`}>
            <LineNumbers text={input} />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Paste JSON to validate...\n\n{\n  "name": "DevTools",\n  "version": "1.0.0",\n  "free": true\n}`}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white outline-none resize-none min-h-[400px] placeholder:text-gray-300 placeholder:font-sans"
            />
          </div>
        </div>

        {/* Result panel */}
        <div className="flex flex-col gap-3">
          {result ? (
            <>
              <ResultHeader result={result} />

              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab("issues")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "issues" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Issues
                  {totalIssues > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      totalErrors > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {totalIssues}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("stats")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "stats" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Stats
                </button>
              </div>

              {activeTab === "issues" && (
                <div className="space-y-2">
                  {totalIssues === 0 ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                      <svg width="16" height="16" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm font-semibold text-green-800">No issues found — JSON is valid</p>
                    </div>
                  ) : (
                    <>
                      {result.errors.map((e, i)   => <IssueRow key={`e-${i}`} type="error"   {...e} />)}
                      {result.warnings.map((w, i) => <IssueRow key={`w-${i}`} type="warning" {...w} />)}
                      {result.hints.map((h, i)    => <IssueRow key={`h-${i}`} type="hint" message={h} line={null} col={null} />)}
                    </>
                  )}
                </div>
              )}

              {activeTab === "stats" && <StatsGrid stats={result.stats} />}
            </>
          ) : (
            /* ── Empty state — shield-check SVG instead of ✅ emoji ── */
            <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-5">
              <div className="w-16 h-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-sm">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="text-center px-6">
                <p className="text-sm font-semibold text-gray-500">Paste JSON to validate</p>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  {autoValidate ? "Validates automatically as you type" : "Click Validate JSON or press ⌘↵"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}