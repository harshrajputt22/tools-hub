"use client";

import { useState, useEffect } from "react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// DIFF ENGINE
// Line-level and word-level diff using LCS algorithm
// ============================================================

function lcs(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: "same", value: a[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", value: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", value: a[i - 1] });
      i--;
    }
  }

  return result;
}

function diffLines(textA, textB) {
  const linesA = textA.split("\n");
  const linesB = textB.split("\n");
  return lcs(linesA, linesB);
}

function diffWords(lineA, lineB) {
  const wordsA = lineA.split(/(\s+)/);
  const wordsB = lineB.split(/(\s+)/);
  return lcs(wordsA, wordsB);
}

function computeDiff(textA, textB, mode) {
  if (mode === "char") {
    const charsA = textA.split("");
    const charsB = textB.split("");
    return lcs(charsA, charsB);
  }
  return diffLines(textA, textB);
}

function buildSideBySide(textA, textB) {
  const rawDiff = diffLines(textA, textB);

  // Pair removed lines with added lines for inline word diff
  const pairs = [];
  let i = 0;

  while (i < rawDiff.length) {
    const op = rawDiff[i];

    if (op.type === "same") {
      pairs.push({ type: "same", left: op.value, right: op.value });
      i++;
    } else if (op.type === "removed") {
      // Look ahead for a corresponding added line
      const next = rawDiff[i + 1];
      if (next && next.type === "added") {
        pairs.push({ type: "changed", left: op.value, right: next.value });
        i += 2;
      } else {
        pairs.push({ type: "removed", left: op.value, right: null });
        i++;
      }
    } else if (op.type === "added") {
      pairs.push({ type: "added", left: null, right: op.value });
      i++;
    } else {
      i++;
    }
  }

  return pairs;
}

function getStats(textA, textB, diff) {
  const added   = diff.filter((d) => d.type === "added").length;
  const removed = diff.filter((d) => d.type === "removed").length;
  const same    = diff.filter((d) => d.type === "same").length;

  return {
    added,
    removed,
    changed: 0,
    same,
    total:   added + removed + same,
    identical: textA === textB,
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

// ── Inline word-level diff renderer ──────────────────────────
function WordDiff({ left, right }) {
  const words = diffWords(left, right);
  return (
    <span>
      {words.map((w, i) => {
        if (w.type === "same")    return <span key={i}>{w.value}</span>;
        if (w.type === "removed") return <span key={i} className="bg-red-200 text-red-900 line-through">{w.value}</span>;
        if (w.type === "added")   return <span key={i} className="bg-green-200 text-green-900">{w.value}</span>;
        return null;
      })}
    </span>
  );
}

// ── Unified diff view ─────────────────────────────────────────
function UnifiedView({ diff }) {
  let lineNumA = 0;
  let lineNumB = 0;

  return (
    <div className="overflow-auto border border-gray-200 rounded-xl bg-gray-900 font-mono text-xs leading-relaxed">
      {diff.map((op, i) => {
        let bgClass   = "";
        let prefix    = " ";
        let numA      = "";
        let numB      = "";

        if (op.type === "same") {
          lineNumA++;
          lineNumB++;
          numA   = lineNumA;
          numB   = lineNumB;
          bgClass = "";
          prefix  = " ";
        } else if (op.type === "removed") {
          lineNumA++;
          numA    = lineNumA;
          numB    = "";
          bgClass = "bg-red-900/40";
          prefix  = "−";
        } else if (op.type === "added") {
          lineNumB++;
          numA    = "";
          numB    = lineNumB;
          bgClass = "bg-green-900/40";
          prefix  = "+";
        }

        return (
          <div key={i} className={`flex items-start ${bgClass} px-0 hover:brightness-110`}>
            {/* Line numbers */}
            <span className="select-none w-10 text-right pr-2 text-gray-600 flex-shrink-0 py-0.5 pl-3 border-r border-gray-800">
              {numA}
            </span>
            <span className="select-none w-10 text-right pr-2 text-gray-600 flex-shrink-0 py-0.5 border-r border-gray-800">
              {numB}
            </span>
            {/* Prefix */}
            <span className={`select-none px-2 py-0.5 flex-shrink-0 font-bold ${
              op.type === "added"   ? "text-green-400" :
              op.type === "removed" ? "text-red-400"   : "text-gray-700"
            }`}>
              {prefix}
            </span>
            {/* Content */}
            <span className={`py-0.5 pr-4 flex-1 whitespace-pre-wrap break-all ${
              op.type === "added"   ? "text-green-300" :
              op.type === "removed" ? "text-red-300"   : "text-gray-300"
            }`}>
              {op.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Side-by-side view ─────────────────────────────────────────
function SideBySideView({ pairs }) {
  let lineNumA = 0;
  let lineNumB = 0;

  return (
    <div className="overflow-auto border border-gray-200 rounded-xl">
      <div className="grid grid-cols-2 min-w-[600px]">
        {/* Headers */}
        <div className="px-4 py-2 bg-gray-50 border-b border-r border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
          Original (A)
        </div>
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
          Modified (B)
        </div>

        {pairs.map((pair, i) => {
          if (pair.type === "same") {
            lineNumA++;
            lineNumB++;
            const na = lineNumA;
            const nb = lineNumB;
            return (
              <>
                <div key={`a-${i}`} className="flex items-start border-b border-r border-gray-100 hover:bg-gray-50">
                  <span className="select-none w-8 text-right pr-2 py-0.5 pl-2 text-xs text-gray-300 font-mono flex-shrink-0 border-r border-gray-200">
                    {na}
                  </span>
                  <span className="px-3 py-0.5 text-xs font-mono text-gray-700 whitespace-pre-wrap break-all flex-1">
                    {pair.left}
                  </span>
                </div>
                <div key={`b-${i}`} className="flex items-start border-b border-gray-100 hover:bg-gray-50">
                  <span className="select-none w-8 text-right pr-2 py-0.5 pl-2 text-xs text-gray-300 font-mono flex-shrink-0 border-r border-gray-200">
                    {nb}
                  </span>
                  <span className="px-3 py-0.5 text-xs font-mono text-gray-700 whitespace-pre-wrap break-all flex-1">
                    {pair.right}
                  </span>
                </div>
              </>
            );
          }

          if (pair.type === "changed") {
            lineNumA++;
            lineNumB++;
            const na = lineNumA;
            const nb = lineNumB;
            return (
              <>
                <div key={`a-${i}`} className="flex items-start border-b border-r border-gray-100 bg-red-50">
                  <span className="select-none w-8 text-right pr-2 py-0.5 pl-2 text-xs text-gray-400 font-mono flex-shrink-0 border-r border-red-200">
                    {na}
                  </span>
                  <span className="px-3 py-0.5 text-xs font-mono whitespace-pre-wrap break-all flex-1">
                    <WordDiff left={pair.left} right={pair.right} />
                  </span>
                </div>
                <div key={`b-${i}`} className="flex items-start border-b border-gray-100 bg-green-50">
                  <span className="select-none w-8 text-right pr-2 py-0.5 pl-2 text-xs text-gray-400 font-mono flex-shrink-0 border-r border-green-200">
                    {nb}
                  </span>
                  <span className="px-3 py-0.5 text-xs font-mono whitespace-pre-wrap break-all flex-1">
                    <WordDiff left={pair.left} right={pair.right} />
                  </span>
                </div>
              </>
            );
          }

          if (pair.type === "removed") {
            lineNumA++;
            const na = lineNumA;
            return (
              <>
                <div key={`a-${i}`} className="flex items-start border-b border-r border-gray-100 bg-red-50">
                  <span className="select-none w-8 text-right pr-2 py-0.5 pl-2 text-xs text-gray-400 font-mono flex-shrink-0 border-r border-red-200">
                    {na}
                  </span>
                  <span className="px-3 py-0.5 text-xs font-mono text-red-800 whitespace-pre-wrap break-all flex-1">
                    {pair.left}
                  </span>
                </div>
                <div key={`b-${i}`} className="flex items-start border-b border-gray-100 bg-red-50/30">
                  <span className="select-none w-8 text-right pr-2 py-0.5 pl-2 text-xs text-transparent font-mono flex-shrink-0 border-r border-gray-100">
                    —
                  </span>
                  <span className="px-3 py-0.5 text-xs font-mono text-gray-300 whitespace-pre-wrap flex-1 select-none">
                    {" "}
                  </span>
                </div>
              </>
            );
          }

          if (pair.type === "added") {
            lineNumB++;
            const nb = lineNumB;
            return (
              <>
                <div key={`a-${i}`} className="flex items-start border-b border-r border-gray-100 bg-green-50/30">
                  <span className="select-none w-8 text-right pr-2 py-0.5 pl-2 text-xs text-transparent font-mono flex-shrink-0 border-r border-gray-100">
                    —
                  </span>
                  <span className="px-3 py-0.5 text-xs font-mono text-gray-300 whitespace-pre-wrap flex-1 select-none">
                    {" "}
                  </span>
                </div>
                <div key={`b-${i}`} className="flex items-start border-b border-gray-100 bg-green-50">
                  <span className="select-none w-8 text-right pr-2 py-0.5 pl-2 text-xs text-gray-400 font-mono flex-shrink-0 border-r border-green-200">
                    {nb}
                  </span>
                  <span className="px-3 py-0.5 text-xs font-mono text-green-800 whitespace-pre-wrap break-all flex-1">
                    {pair.right}
                  </span>
                </div>
              </>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TextCompare() {
  const [textA,    setTextA]    = useState("");
  const [textB,    setTextB]    = useState("");
  const [viewMode, setViewMode] = useState("split");   // split | unified
  const [diff,     setDiff]     = useState([]);
  const [pairs,    setPairs]    = useState([]);
  const [stats,    setStats]    = useState(null);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase,       setIgnoreCase]       = useState(false);

  // ── Compute diff ──────────────────────────────────────────────
  useEffect(() => {
    let a = textA;
    let b = textB;

    if (ignoreWhitespace) {
      a = a.split("\n").map((l) => l.trim()).join("\n");
      b = b.split("\n").map((l) => l.trim()).join("\n");
    }

    if (ignoreCase) {
      a = a.toLowerCase();
      b = b.toLowerCase();
    }

    const lineDiff = diffLines(a, b);
    const sidePairs = buildSideBySide(a, b);

    setDiff(lineDiff);
    setPairs(sidePairs);
    setStats(getStats(a, b, lineDiff));
  }, [textA, textB, ignoreWhitespace, ignoreCase]);

  function handleSwap() {
    setTextA(textB);
    setTextB(textA);
  }

  function handleClear() {
    setTextA("");
    setTextB("");
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
                <span className="text-xs text-gray-400">
                  {textA.split("\n").length} lines · {textA.length} chars
                </span>
              )}
            </div>
            <CopyButton text={textA} />
          </div>
          <textarea
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="Paste original text here (A)…"
            spellCheck={false}
            autoCorrect="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[240px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
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
                <span className="text-xs text-gray-400">
                  {textB.split("\n").length} lines · {textB.length} chars
                </span>
              )}
            </div>
            <CopyButton text={textB} />
          </div>
          <textarea
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            placeholder="Paste modified text here (B)…"
            spellCheck={false}
            autoCorrect="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[240px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">

        {/* View mode */}
        <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
          {[
            { value: "split",   label: "Side by side" },
            { value: "unified", label: "Unified"      },
          ].map((m) => (
            <button
              key={m.value}
              onClick={() => setViewMode(m.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                viewMode === m.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Options */}
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <button
            role="switch"
            aria-checked={ignoreWhitespace}
            onClick={() => setIgnoreWhitespace((v) => !v)}
            className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
              ignoreWhitespace ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
              ignoreWhitespace ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </button>
          <span className="text-xs font-medium text-gray-600">Ignore whitespace</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <button
            role="switch"
            aria-checked={ignoreCase}
            onClick={() => setIgnoreCase((v) => !v)}
            className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
              ignoreCase ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
              ignoreCase ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </button>
          <span className="text-xs font-medium text-gray-600">Ignore case</span>
        </label>

        <div className="flex items-center gap-2 ml-auto">
          {hasContent && (
            <button
              onClick={handleSwap}
              title="Swap A and B"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-lg cursor-pointer transition-colors"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Swap A ↔ B
            </button>
          )}
          {hasContent && (
            <button
              onClick={handleClear}
              className="text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer border border-gray-200 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────── */}
      {stats && hasContent && (
        <div className={`flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl border ${
          stats.identical
            ? "bg-green-50 border-green-200"
            : "bg-white border-gray-200"
        }`}>
          {stats.identical ? (
            <div className="flex items-center gap-2">
              <svg width="15" height="15" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-bold text-green-700">
                Texts are identical
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m0 6L9 8" />
                </svg>
                <span className="text-sm font-bold text-gray-700">Texts differ</span>
              </div>
              <div className="w-px h-4 bg-gray-200" />
              {[
                { label: "Removed", value: stats.removed, color: "text-red-600",   bg: "bg-red-50 border-red-200"   },
                { label: "Added",   value: stats.added,   color: "text-green-600", bg: "bg-green-50 border-green-200" },
                { label: "Same",    value: stats.same,    color: "text-gray-600",  bg: "bg-gray-50 border-gray-200"  },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${bg}`}>
                  <span className={`font-bold font-mono ${color}`}>{value}</span>
                  <span className="text-gray-500">{label.toLowerCase()} line{value !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Diff output ───────────────────────────────────────── */}
      {hasDiff && (
        viewMode === "unified"
          ? <UnifiedView diff={diff} />
          : <SideBySideView pairs={pairs} />
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!hasContent && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-3">
          <p className="text-sm font-semibold text-gray-400">Paste text in both panels to compare</p>
          <p className="text-xs text-gray-300">Differences highlight automatically</p>
        </div>
      )}
    </div>
  );
}