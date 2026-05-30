"use client";

import { useState, useEffect } from "react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// DIFF ENGINE
// Character-level and word-level LCS diff
// ============================================================

function lcs(a, b) {
  const m = a.length;
  const n = b.length;

  // For very long inputs, use a faster approximation
  if (m * n > 500000) {
    return lcsFast(a, b);
  }

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: "same",    val: a[i - 1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "added",   val: b[j - 1] }); j--;
    } else {
      ops.unshift({ type: "removed", val: a[i - 1] }); i--;
    }
  }

  return ops;
}

// Fast line-based approximation for large texts
function lcsFast(a, b) {
  const ops = [];
  const setA = new Set(a);
  const setB = new Set(b);

  let ai = 0, bi = 0;
  while (ai < a.length || bi < b.length) {
    if (ai < a.length && bi < b.length && a[ai] === b[bi]) {
      ops.push({ type: "same",    val: a[ai] }); ai++; bi++;
    } else if (bi < b.length && !setA.has(b[bi])) {
      ops.push({ type: "added",   val: b[bi] }); bi++;
    } else if (ai < a.length && !setB.has(a[ai])) {
      ops.push({ type: "removed", val: a[ai] }); ai++;
    } else {
      if (ai < a.length) { ops.push({ type: "removed", val: a[ai] }); ai++; }
      if (bi < b.length) { ops.push({ type: "added",   val: b[bi] }); bi++;  }
    }
  }
  return ops;
}

// ── Tokenize into words + whitespace + punctuation ────────────
function tokenize(text) {
  return text.match(/\S+|\s+/g) || [];
}

// ── Character diff ────────────────────────────────────────────
function charDiff(a, b) {
  return lcs(a.split(""), b.split(""));
}

// ── Word diff ─────────────────────────────────────────────────
function wordDiff(a, b) {
  return lcs(tokenize(a), tokenize(b));
}

// ── Line diff ─────────────────────────────────────────────────
function lineDiff(a, b) {
  return lcs(a.split("\n"), b.split("\n"));
}

// ── Merge consecutive ops of same type ───────────────────────
function mergeOps(ops) {
  const merged = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) {
      last.val += op.val;
    } else {
      merged.push({ ...op });
    }
  }
  return merged;
}

// ── Compute stats ─────────────────────────────────────────────
function computeStats(textA, textB, ops) {
  const added   = ops.filter((o) => o.type === "added").length;
  const removed = ops.filter((o) => o.type === "removed").length;
  const same    = ops.filter((o) => o.type === "same").length;

  const addedChars   = ops.filter((o) => o.type === "added").reduce((s, o) => s + o.val.length, 0);
  const removedChars = ops.filter((o) => o.type === "removed").reduce((s, o) => s + o.val.length, 0);

  const similarity = textA.length + textB.length === 0 ? 100
    : Math.round(
        (2 * ops.filter((o) => o.type === "same").reduce((s, o) => s + o.val.length, 0)) /
        (textA.length + textB.length) * 100
      );

  return {
    added,
    removed,
    same,
    addedChars,
    removedChars,
    identical: textA === textB,
    similarity,
  };
}

// ============================================================
// SUB-COMPONENTS
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
      {copied ? (
        <>
          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

// ── Similarity meter ──────────────────────────────────────────
function SimilarityMeter({ value }) {
  const color =
    value === 100 ? "bg-green-500" :
    value >= 80   ? "bg-blue-500"  :
    value >= 50   ? "bg-amber-500" :
                    "bg-red-500";

  const label =
    value === 100 ? "Identical"    :
    value >= 80   ? "Very similar" :
    value >= 50   ? "Somewhat similar" :
    value >= 20   ? "Mostly different" :
                    "Very different";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-xs font-bold font-mono w-8 text-right ${
        value === 100 ? "text-green-600" :
        value >= 80   ? "text-blue-600"  :
        value >= 50   ? "text-amber-600" :
                        "text-red-600"
      }`}>
        {value}%
      </span>
      <span className="text-xs text-gray-400 w-28 flex-shrink-0">{label}</span>
    </div>
  );
}

// ── Inline diff renderer ──────────────────────────────────────
function InlineDiff({ ops, granularity }) {
  if (!ops.length) return null;

  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
      {ops.map((op, i) => {
        if (op.type === "same") {
          return <span key={i} className="text-gray-700">{op.val}</span>;
        }
        if (op.type === "removed") {
          return (
            <span
              key={i}
              className="bg-red-100 text-red-800 line-through decoration-red-500 rounded-sm px-0.5"
            >
              {op.val}
            </span>
          );
        }
        if (op.type === "added") {
          return (
            <span
              key={i}
              className="bg-green-100 text-green-800 rounded-sm px-0.5"
            >
              {op.val}
            </span>
          );
        }
        return null;
      })}
    </div>
  );
}

// ── Change list ───────────────────────────────────────────────
function ChangeList({ ops }) {
  const changes = ops.filter((o) => o.type !== "same");

  if (changes.length === 0) return null;

  // Pair consecutive removed+added as substitutions
  const items = [];
  let i = 0;
  while (i < changes.length) {
    const curr = changes[i];
    const next = changes[i + 1];
    if (curr.type === "removed" && next?.type === "added") {
      items.push({ type: "changed", from: curr.val, to: next.val });
      i += 2;
    } else {
      items.push({ type: curr.type, val: curr.val });
      i++;
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Changes ({items.length})
        </span>
      </div>
      <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
        {items.slice(0, 200).map((item, idx) => (
          <div key={idx} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
            {/* Type badge */}
            <span className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${
              item.type === "removed" ? "bg-red-100 text-red-700 border border-red-200" :
              item.type === "added"   ? "bg-green-100 text-green-700 border border-green-200" :
                                        "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
              {item.type === "removed" ? "−" : item.type === "added" ? "+" : "~"}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0 text-xs font-mono">
              {item.type === "changed" ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-red-50 border border-red-200 text-red-700 px-1.5 py-0.5 rounded line-through break-all">
                    {item.from.slice(0, 80)}{item.from.length > 80 ? "…" : ""}
                  </span>
                  <svg width="12" height="12" className="text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <span className="bg-green-50 border border-green-200 text-green-700 px-1.5 py-0.5 rounded break-all">
                    {item.to.slice(0, 80)}{item.to.length > 80 ? "…" : ""}
                  </span>
                </div>
              ) : (
                <span className={`px-1.5 py-0.5 rounded break-all ${
                  item.type === "removed"
                    ? "bg-red-50 border border-red-200 text-red-700 line-through"
                    : "bg-green-50 border border-green-200 text-green-700"
                }`}>
                  {item.val.slice(0, 120)}{item.val.length > 120 ? "…" : ""}
                </span>
              )}
            </div>
          </div>
        ))}
        {items.length > 200 && (
          <div className="px-4 py-2.5 text-xs text-gray-400 text-center">
            Showing 200 of {items.length} changes
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TextDiffChecker() {
  const [textA,       setTextA]       = useState("");
  const [textB,       setTextB]       = useState("");
  const [granularity, setGranularity] = useState("word"); // char | word | line
  const [ops,         setOps]         = useState([]);
  const [stats,       setStats]       = useState(null);
  const [view,        setView]        = useState("inline"); // inline | changes

  // ── Compute diff ──────────────────────────────────────────────
  useEffect(() => {
    if (!textA && !textB) {
      setOps([]);
      setStats(null);
      return;
    }

    let rawOps;
    if (granularity === "char") {
      rawOps = charDiff(textA, textB);
    } else if (granularity === "word") {
      rawOps = wordDiff(textA, textB);
    } else {
      rawOps = lineDiff(textA, textB);
    }

    const merged = mergeOps(rawOps);
    setOps(merged);
    setStats(computeStats(textA, textB, merged));
  }, [textA, textB, granularity]);

  function handleSwap() {
    setTextA(textB);
    setTextB(textA);
  }

  function handleClear() {
    setTextA("");
    setTextB("");
    setOps([]);
    setStats(null);
  }

  const hasContent = textA || textB;
  const hasDiff    = stats && !stats.identical && hasContent;

  return (
    <div className="space-y-4">

      {/* ── Input panels ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Text A */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-bold flex items-center justify-center">
                A
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Original
              </span>
              {textA && (
                <span className="text-xs text-gray-400 tabular-nums">
                  {textA.length} chars
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <CopyButton text={textA} />
              {textA && (
                <button
                  onClick={() => setTextA("")}
                  className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <textarea
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="Paste original text here…"
            spellCheck={false}
            autoCorrect="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[200px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        {/* Text B */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-100 border border-green-300 text-green-700 rounded text-xs font-bold flex items-center justify-center">
                B
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Modified
              </span>
              {textB && (
                <span className="text-xs text-gray-400 tabular-nums">
                  {textB.length} chars
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <CopyButton text={textB} />
              {textB && (
                <button
                  onClick={() => setTextB("")}
                  className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <textarea
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            placeholder="Paste modified text here…"
            spellCheck={false}
            autoCorrect="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[200px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      {hasContent && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">

          {/* Granularity */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Compare by:</span>
            <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
              {[
                { value: "char", label: "Character" },
                { value: "word", label: "Word"      },
                { value: "line", label: "Line"      },
              ].map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGranularity(g.value)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    granularity === g.value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* View mode */}
          {hasDiff && (
            <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
              {[
                { value: "inline",  label: "Inline" },
                { value: "changes", label: "Changes" },
              ].map((v) => (
                <button
                  key={v.value}
                  onClick={() => setView(v.value)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    view === v.value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleSwap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-lg cursor-pointer transition-colors"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Swap
            </button>
            <button
              onClick={handleClear}
              className="text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer border border-gray-200 transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* ── Stats ─────────────────────────────────────────────── */}
      {stats && hasContent && (
        <div className={`px-4 py-3 rounded-xl border space-y-3 ${
          stats.identical
            ? "bg-green-50 border-green-200"
            : "bg-white border-gray-200"
        }`}>
          {stats.identical ? (
            <div className="flex items-center gap-2">
              <svg width="15" height="15" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-bold text-green-700">Texts are identical</span>
            </div>
          ) : (
            <>
              {/* Similarity bar */}
              <SimilarityMeter value={stats.similarity} />

              {/* Counts */}
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Removed", value: stats.removedChars, unit: "chars", color: "text-red-600",   bg: "bg-red-50 border-red-200"   },
                  { label: "Added",   value: stats.addedChars,   unit: "chars", color: "text-green-600", bg: "bg-green-50 border-green-200" },
                  { label: "Changes", value: ops.filter((o) => o.type !== "same").length, unit: granularity === "char" ? "chars" : granularity === "word" ? "tokens" : "lines",
                    color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
                ].map(({ label, value, unit, color, bg }) => (
                  <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${bg}`}>
                    <span className={`font-bold font-mono ${color}`}>{value}</span>
                    <span className="text-gray-500">{unit} {label.toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Diff output ───────────────────────────────────────── */}
      {hasDiff && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {view === "inline" ? "Inline Diff" : "Change List"}
            </span>
            <div className="flex items-center gap-3 text-xs ml-2">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-200 border border-red-300 inline-block" />
                <span className="text-gray-500">Removed</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-200 border border-green-300 inline-block" />
                <span className="text-gray-500">Added</span>
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 bg-white">
            {view === "inline" ? (
              <InlineDiff ops={ops} granularity={granularity} />
            ) : (
              <ChangeList ops={ops} />
            )}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!hasContent && (
        <div className="flex flex-col items-center justify-center py-14 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-3">
          <span className="text-4xl opacity-20">🔍</span>
          <p className="text-sm font-semibold text-gray-400">
            Paste text in both panels to check differences
          </p>
          <p className="text-xs text-gray-300">
            Compare by character, word, or line · Inline and change list views
          </p>
        </div>
      )}
    </div>
  );
}