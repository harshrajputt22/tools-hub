"use client";

import { useState, useCallback, useEffect } from "react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// DIFF ENGINE
// ============================================================

const DIFF_TYPES = {
  ADDED:   "added",
  REMOVED: "removed",
  CHANGED: "changed",
  EQUAL:   "equal",
  NESTED:  "nested",
};

function diffJson(left, right, path = "") {
  const diffs = [];

  if (
    left !== null && right !== null &&
    typeof left === "object" && typeof right === "object" &&
    !Array.isArray(left) && !Array.isArray(right)
  ) {
    const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
    allKeys.forEach((key) => {
      const currentPath = path ? `${path}.${key}` : key;
      const leftVal  = left[key];
      const rightVal = right[key];
      if (!(key in left)) {
        diffs.push({ type: DIFF_TYPES.ADDED,   path: currentPath, key, left: undefined, right: rightVal });
      } else if (!(key in right)) {
        diffs.push({ type: DIFF_TYPES.REMOVED, path: currentPath, key, left: leftVal, right: undefined });
      } else if (typeof leftVal === "object" && leftVal !== null && typeof rightVal === "object" && rightVal !== null) {
        const nested = diffJson(leftVal, rightVal, currentPath);
        diffs.push(nested.length > 0
          ? { type: DIFF_TYPES.NESTED, path: currentPath, key, diffs: nested }
          : { type: DIFF_TYPES.EQUAL,  path: currentPath, key, left: leftVal, right: rightVal });
      } else if (leftVal !== rightVal) {
        diffs.push({ type: DIFF_TYPES.CHANGED, path: currentPath, key, left: leftVal, right: rightVal });
      } else {
        diffs.push({ type: DIFF_TYPES.EQUAL,   path: currentPath, key, left: leftVal, right: rightVal });
      }
    });
    return diffs;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen; i++) {
      const currentPath = `${path}[${i}]`;
      if (i >= left.length) {
        diffs.push({ type: DIFF_TYPES.ADDED,   path: currentPath, key: `[${i}]`, left: undefined, right: right[i] });
      } else if (i >= right.length) {
        diffs.push({ type: DIFF_TYPES.REMOVED, path: currentPath, key: `[${i}]`, left: left[i], right: undefined });
      } else if (typeof left[i] === "object" && left[i] !== null && typeof right[i] === "object" && right[i] !== null) {
        const nested = diffJson(left[i], right[i], currentPath);
        diffs.push(nested.length > 0
          ? { type: DIFF_TYPES.NESTED, path: currentPath, key: `[${i}]`, diffs: nested }
          : { type: DIFF_TYPES.EQUAL,  path: currentPath, key: `[${i}]`, left: left[i], right: right[i] });
      } else if (left[i] !== right[i]) {
        diffs.push({ type: DIFF_TYPES.CHANGED, path: currentPath, key: `[${i}]`, left: left[i], right: right[i] });
      } else {
        diffs.push({ type: DIFF_TYPES.EQUAL,   path: currentPath, key: `[${i}]`, left: left[i], right: right[i] });
      }
    }
    return diffs;
  }

  if (left !== right) {
    diffs.push({ type: DIFF_TYPES.CHANGED, path: path || "root", key: path || "root", left, right });
  }
  return diffs;
}

function countDiffs(diffs) {
  let added = 0, removed = 0, changed = 0, equal = 0;
  function walk(entries) {
    entries.forEach((d) => {
      if (d.type === DIFF_TYPES.NESTED)   walk(d.diffs);
      else if (d.type === DIFF_TYPES.ADDED)   added++;
      else if (d.type === DIFF_TYPES.REMOVED) removed++;
      else if (d.type === DIFF_TYPES.CHANGED) changed++;
      else if (d.type === DIFF_TYPES.EQUAL)   equal++;
    });
  }
  walk(diffs);
  return { added, removed, changed, equal };
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function displayValue(val) {
  if (val === undefined) return "undefined";
  if (val === null)      return "null";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

function DiffBadge({ type }) {
  const map = {
    [DIFF_TYPES.ADDED]:   { label: "ADDED",   cls: "bg-green-100 text-green-700 border-green-200"  },
    [DIFF_TYPES.REMOVED]: { label: "REMOVED", cls: "bg-red-100 text-red-700 border-red-200"        },
    [DIFF_TYPES.CHANGED]: { label: "CHANGED", cls: "bg-amber-100 text-amber-700 border-amber-200"  },
    [DIFF_TYPES.EQUAL]:   { label: "EQUAL",   cls: "bg-gray-100 text-gray-500 border-gray-200"     },
    [DIFF_TYPES.NESTED]:  { label: "NESTED",  cls: "bg-blue-100 text-blue-700 border-blue-200"     },
  };
  const { label, cls } = map[type] || map[DIFF_TYPES.EQUAL];
  return (
    <span className={`px-1.5 py-0.5 text-xs font-bold rounded border uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function DiffRow({ diff, depth = 0, showEqual }) {
  const [expanded, setExpanded] = useState(true);
  if (diff.type === DIFF_TYPES.EQUAL && !showEqual) return null;

  const indent = depth * 16;

  if (diff.type === DIFF_TYPES.NESTED) {
    return (
      <div>
        <button onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
          style={{ paddingLeft: `${16 + indent}px` }}>
          <svg width="12" height="12" className={`flex-shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-mono font-semibold text-gray-700">{diff.key}</span>
          <DiffBadge type={DIFF_TYPES.NESTED} />
          <span className="text-xs text-gray-400">{diff.diffs.length} change{diff.diffs.length !== 1 ? "s" : ""}</span>
        </button>
        {expanded && (
          <div className="border-l-2 border-blue-100 ml-6">
            {diff.diffs.map((child, i) => <DiffRow key={i} diff={child} depth={depth + 1} showEqual={showEqual} />)}
          </div>
        )}
      </div>
    );
  }

  const rowBg = {
    [DIFF_TYPES.ADDED]:   "bg-green-50 border-l-2 border-green-400",
    [DIFF_TYPES.REMOVED]: "bg-red-50 border-l-2 border-red-400",
    [DIFF_TYPES.CHANGED]: "bg-amber-50 border-l-2 border-amber-400",
    [DIFF_TYPES.EQUAL]:   "bg-white border-l-2 border-transparent",
  };

  return (
    <div className={`px-4 py-2.5 ${rowBg[diff.type] || ""}`} style={{ paddingLeft: `${16 + indent}px` }}>
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-xs font-mono font-semibold text-gray-700 flex-shrink-0">{diff.key}</span>
        <DiffBadge type={diff.type} />
      </div>

      {diff.type === DIFF_TYPES.CHANGED && (
        <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-500 font-medium mb-1">Before</p>
            <p className="text-xs font-mono text-red-700 break-all">{displayValue(diff.left)}</p>
          </div>
          <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-500 font-medium mb-1">After</p>
            <p className="text-xs font-mono text-green-700 break-all">{displayValue(diff.right)}</p>
          </div>
        </div>
      )}
      {diff.type === DIFF_TYPES.ADDED && (
        <div className="mt-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs font-mono text-green-700 break-all">{displayValue(diff.right)}</p>
        </div>
      )}
      {diff.type === DIFF_TYPES.REMOVED && (
        <div className="mt-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-mono text-red-700 break-all line-through">{displayValue(diff.left)}</p>
        </div>
      )}
      {diff.type === DIFF_TYPES.EQUAL && showEqual && (
        <div className="mt-1 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg">
          <p className="text-xs font-mono text-gray-400 break-all">{displayValue(diff.left)}</p>
        </div>
      )}
    </div>
  );
}

function StatsSummary({ counts }) {
  const items = [
    { label: "Added",   value: counts.added,   cls: "text-green-600 bg-green-50 border-green-200"  },
    { label: "Removed", value: counts.removed, cls: "text-red-600 bg-red-50 border-red-200"        },
    { label: "Changed", value: counts.changed, cls: "text-amber-600 bg-amber-50 border-amber-200"  },
    { label: "Equal",   value: counts.equal,   cls: "text-gray-500 bg-gray-50 border-gray-200"     },
  ];
  const isIdentical = counts.added === 0 && counts.removed === 0 && counts.changed === 0;
  return (
    <div className="space-y-3">
      {isIdentical && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <svg width="16" height="16" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-semibold text-green-800">JSON objects are identical — no differences found</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map(({ label, value, cls }) => (
          <div key={label} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${cls}`}>
            <span className="text-base font-bold tabular-nums">{value}</span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelHeader({ label, charCount, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        {charCount > 0 && <span className="text-xs text-gray-400 tabular-nums">{charCount.toLocaleString()} chars</span>}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
      <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs font-mono text-red-700 leading-relaxed break-all">{message}</p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JsonDiffChecker() {
  const [leftInput,  setLeftInput]  = useState("");
  const [rightInput, setRightInput] = useState("");
  const [diffs,      setDiffs]      = useState(null);
  const [counts,     setCounts]     = useState(null);
  const [error,      setError]      = useState(null);
  const [leftError,  setLeftError]  = useState(null);
  const [rightError, setRightError] = useState(null);
  const [showEqual,  setShowEqual]  = useState(false);
  const [copied,     setCopied]     = useState(false);

  const handleCompare = useCallback(() => {
    setLeftError(null); setRightError(null); setError(null); setDiffs(null); setCounts(null);

    const l = leftInput.trim();
    const r = rightInput.trim();

    if (!l && !r) { setError("Both inputs are empty."); return; }
    if (!l)       { setLeftError("Left input is empty."); return; }
    if (!r)       { setRightError("Right input is empty."); return; }

    let leftParsed, rightParsed;
    try       { leftParsed  = JSON.parse(l); }
    catch (e) { setLeftError(`Invalid JSON: ${e.message}`); return; }
    try       { rightParsed = JSON.parse(r); }
    catch (e) { setRightError(`Invalid JSON: ${e.message}`); return; }

    const result = diffJson(leftParsed, rightParsed);
    setDiffs(result);
    setCounts(countDiffs(result));
  }, [leftInput, rightInput]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleCompare();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCompare]);

  function handleSwap() {
    setLeftInput(rightInput); setRightInput(leftInput);
    setDiffs(null); setCounts(null); setLeftError(null); setRightError(null); setError(null);
  }

  function handleClear() {
    setLeftInput(""); setRightInput("");
    setDiffs(null); setCounts(null); setLeftError(null); setRightError(null); setError(null);
  }

  async function handleCopyReport() {
    if (!diffs || !counts) return;
    function flattenDiffs(entries, out = []) {
      entries.forEach((d) => {
        if (d.type === DIFF_TYPES.NESTED) flattenDiffs(d.diffs, out);
        else if (d.type !== DIFF_TYPES.EQUAL) {
          out.push(
            `[${d.type.toUpperCase()}] ${d.path}\n` +
            (d.type === DIFF_TYPES.CHANGED
              ? `  Before: ${displayValue(d.left)}\n  After:  ${displayValue(d.right)}`
              : d.type === DIFF_TYPES.ADDED
              ? `  Value: ${displayValue(d.right)}`
              : `  Value: ${displayValue(d.left)}`)
          );
        }
      });
      return out;
    }
    const report = [
      "JSON Diff Report", "================",
      `Added: ${counts.added} | Removed: ${counts.removed} | Changed: ${counts.changed} | Equal: ${counts.equal}`,
      "", ...flattenDiffs(diffs),
    ].join("\n");
    const ok = await copyToClipboard(report);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleCompare} data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Compare JSON
        </button>

        <button onClick={handleSwap}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-all">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Swap
        </button>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <button role="switch" aria-checked={showEqual} onClick={() => setShowEqual((v) => !v)}
            className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none ${showEqual ? "bg-blue-600" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${showEqual ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <span className="text-xs font-medium text-gray-600">Show equal</span>
        </label>

        {(leftInput || rightInput) && (
          <button onClick={handleClear}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors">
            Clear all
          </button>
        )}

        {diffs && counts && (
          <button onClick={handleCopyReport}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
            {copied ? (
              <span className="text-green-600">Copied!</span>
            ) : (
              <>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy report
              </>
            )}
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 ml-auto">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">↵</kbd>
          <span>to compare</span>
        </div>
      </div>

      {/* ── Two input panels ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left */}
        <div className="flex flex-col">
          <PanelHeader label="Original JSON (Left)" charCount={leftInput.length}
            actions={leftInput && (
              <button onClick={() => { setLeftInput(""); setLeftError(null); }}
                className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                Clear
              </button>
            )}
          />
          <textarea value={leftInput}
            onChange={(e) => { setLeftInput(e.target.value); if (leftError) setLeftError(null); }}
            placeholder="Paste original JSON here..."
            spellCheck={false} autoCorrect="off" autoCapitalize="off"
            className={`flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none resize-none min-h-[280px] transition-colors placeholder:text-gray-300 ${leftError ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-400"}`}
          />
          {leftError && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs font-mono text-red-600 px-1">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {leftError}
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-col">
          <PanelHeader label="Modified JSON (Right)" charCount={rightInput.length}
            actions={rightInput && (
              <button onClick={() => { setRightInput(""); setRightError(null); }}
                className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                Clear
              </button>
            )}
          />
          <textarea value={rightInput}
            onChange={(e) => { setRightInput(e.target.value); if (rightError) setRightError(null); }}
            placeholder="Paste modified JSON here..."
            spellCheck={false} autoCorrect="off" autoCapitalize="off"
            className={`flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none resize-none min-h-[280px] transition-colors placeholder:text-gray-300 ${rightError ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-400"}`}
          />
          {rightError && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs font-mono text-red-600 px-1">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {rightError}
            </div>
          )}
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* ── Diff results ─────────────────────────────────────── */}
      {diffs && counts && (
        <div className="space-y-4">
          <StatsSummary counts={counts} />
          {diffs.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Diff Result</span>
                <span className="text-xs text-gray-400">
                  {diffs.length} top-level key{diffs.length !== 1 ? "s" : ""} compared
                </span>
              </div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {diffs.map((diff, i) => <DiffRow key={i} diff={diff} depth={0} showEqual={showEqual} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}