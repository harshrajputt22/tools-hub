"use client";

import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Play,
  Plus,
  X,
  Zap,
  Activity,
  Layers,
} from "lucide-react";
import { copyToClipboard, downloadText } from "@/lib/helpers";

function runRegex(pattern, flags, input) {
  if (!pattern) {
    return { success: true, matches: [], groups: [], error: null, time: 0 };
  }

  const start = performance.now();

  try {
    const allFlags = flags.includes("g") ? flags : flags + "g";
    const scanRe = new RegExp(pattern, allFlags);
    const matches = [];

    let m;
    let lastIndex = -1;
    let safetyCount = 0;

    while ((m = scanRe.exec(input)) !== null && safetyCount < 10000) {
      safetyCount++;

      if (m.index === lastIndex) {
        scanRe.lastIndex++;
        continue;
      }
      lastIndex = m.index;

      const namedGroups = m.groups ? { ...m.groups } : {};
      const numbered = Array.from(m).slice(1);

      matches.push({
        index: m.index,
        end: m.index + m[0].length,
        value: m[0],
        length: m[0].length,
        numbered,
        namedGroups,
        line: input.slice(0, m.index).split("\n").length,
        col: m.index - input.lastIndexOf("\n", m.index - 1),
        context: {
          before: input.slice(Math.max(0, m.index - 20), m.index),
          after: input.slice(m.index + m[0].length, m.index + m[0].length + 20),
        },
      });
    }

    const time = performance.now() - start;
    const allGroupNames = new Set();
    for (const match of matches) {
      Object.keys(match.namedGroups).forEach((k) => allGroupNames.add(k));
    }
    const maxGroups = matches.reduce((max, match) => Math.max(max, match.numbered.length), 0);

    return {
      success: true,
      matches,
      groupNames: [...allGroupNames],
      maxGroups,
      error: null,
      time: Math.round(time * 100) / 100,
      truncated: safetyCount >= 10000,
    };
  } catch (e) {
    return {
      success: false,
      matches: [],
      groups: [],
      error: e.message,
      time: 0,
    };
  }
}

function benchmark(pattern, flags, input, iterations = 1000) {
  try {
    const re = new RegExp(pattern, flags);
    const runs = [];
    const useG = flags.includes("g");

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      if (useG) {
        const scanRe = new RegExp(pattern, flags);
        let count = 0;
        while (scanRe.exec(input) !== null && count++ < 10000) {}
      } else {
        re.exec(input);
      }
      runs.push(performance.now() - start);
    }

    const total = runs.reduce((a, b) => a + b, 0);
    const avg = total / iterations;
    const min = Math.min(...runs);
    const max = Math.max(...runs);
    const median = runs.sort((a, b) => a - b)[Math.floor(iterations / 2)];
    const ops = Math.round(1000 / avg);

    return {
      success: true,
      iterations,
      avg: Math.round(avg * 1000) / 1000,
      min: Math.round(min * 1000) / 1000,
      max: Math.round(max * 1000) / 1000,
      median: Math.round(median * 1000) / 1000,
      total: Math.round(total * 100) / 100,
      ops,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function runTests(pattern, flags, testCases) {
  if (!pattern) {
    return testCases.map((tc) => ({ ...tc, status: "skipped", reason: "No pattern" }));
  }

  return testCases.map((tc) => {
    try {
      const re = new RegExp(pattern, flags);
      const matches = tc.input.match(re);

      if (tc.expectMatch) {
        if (matches && matches.length > 0) {
          if (tc.expectedValue !== undefined && tc.expectedValue !== "") {
            const fullMatch = matches[0];
            if (fullMatch === tc.expectedValue) {
              return { ...tc, status: "pass", actual: fullMatch };
            }
            return {
              ...tc,
              status: "fail",
              reason: `Expected match "${tc.expectedValue}", got "${fullMatch}"`,
              actual: fullMatch,
            };
          }
          return { ...tc, status: "pass", actual: matches[0] };
        }
        return { ...tc, status: "fail", reason: "Expected a match but none found", actual: null };
      }

      if (!matches || matches.length === 0) {
        return { ...tc, status: "pass", actual: null };
      }
      return {
        ...tc,
        status: "fail",
        reason: `Expected NO match but got "${matches[0]}"`,
        actual: matches[0],
      };
    } catch (e) {
      return { ...tc, status: "error", reason: e.message };
    }
  });
}

function buildSegments(text, matches, activeMatchIdx = -1) {
  if (!matches.length) {
    return [{ text, type: "plain", matchIdx: -1 }];
  }

  const segments = [];
  let pos = 0;

  matches.forEach((match, idx) => {
    if (match.index > pos) {
      segments.push({ text: text.slice(pos, match.index), type: "plain", matchIdx: -1 });
    }
    segments.push({
      text: match.value,
      type: "match",
      matchIdx: idx,
      active: idx === activeMatchIdx,
    });
    pos = match.end;
  });

  if (pos < text.length) {
    segments.push({ text: text.slice(pos), type: "plain", matchIdx: -1 });
  }

  return segments;
}

function explainRegex(pattern) {
  if (!pattern) return [];

  const tokens = [];
  let i = 0;

  const rules = [
    { re: /^\^/, color: "rose", desc: "Start of string/line" },
    { re: /^\$/, color: "rose", desc: "End of string/line" },
    { re: /^\\b/, color: "rose", desc: "Word boundary" },
    { re: /^\\B/, color: "rose", desc: "Non-word boundary" },
    { re: /^\\d/, color: "blue", desc: "Any digit [0-9]" },
    { re: /^\\D/, color: "blue", desc: "Any non-digit" },
    { re: /^\\w/, color: "blue", desc: "Word char [a-zA-Z0-9_]" },
    { re: /^\\W/, color: "blue", desc: "Non-word char" },
    { re: /^\\s/, color: "blue", desc: "Whitespace char" },
    { re: /^\\S/, color: "blue", desc: "Non-whitespace char" },
    { re: /^\\n/, color: "teal", desc: "Newline character" },
    { re: /^\\t/, color: "teal", desc: "Tab character" },
    { re: /^\\r/, color: "teal", desc: "Carriage return" },
    { re: /^\\\./, color: "teal", desc: "Literal dot" },
    { re: /^\\\\/, color: "teal", desc: "Literal backslash" },
    { re: /^\\\//, color: "teal", desc: "Literal forward slash" },
    { re: /^\\([^a-zA-Z])/, color: "teal", desc: "Escaped character" },
    { re: /^\\([a-zA-Z])/, color: "teal", desc: "Escaped sequence" },
    { re: /^\(\?<=[^)]+\)/, color: "amber", desc: "Positive lookbehind" },
    { re: /^\(\?<![^)]+\)/, color: "amber", desc: "Negative lookbehind" },
    { re: /^\(\?=[^)]+\)/, color: "amber", desc: "Positive lookahead" },
    { re: /^\(\?![^)]+\)/, color: "amber", desc: "Negative lookahead" },
    { re: /^\(\?</, color: "purple", desc: "Named capture group" },
    { re: /^\(\?:/, color: "purple", desc: "Non-capturing group" },
    { re: /^\(/, color: "purple", desc: "Capture group start" },
    { re: /^\)/, color: "purple", desc: "Group end" },
    { re: /^\[[^\]]*\]/, color: "green", desc: "Character class" },
    { re: /^\{\d+,\d+\}\?/, color: "orange", desc: "Range quantifier (lazy)" },
    { re: /^\{\d+,\}\?/, color: "orange", desc: "Min quantifier (lazy)" },
    { re: /^\{\d+\}\?/, color: "orange", desc: "Exact quantifier (lazy)" },
    { re: /^\{\d+,\d+\}/, color: "orange", desc: "Range quantifier (greedy)" },
    { re: /^\{\d+,\}/, color: "orange", desc: "Min quantifier (greedy)" },
    { re: /^\{\d+\}/, color: "orange", desc: "Exact quantifier (greedy)" },
    { re: /^\*\?/, color: "orange", desc: "Zero or more (lazy)" },
    { re: /^\+\?/, color: "orange", desc: "One or more (lazy)" },
    { re: /^\?\?/, color: "orange", desc: "Zero or one (lazy)" },
    { re: /^\*/, color: "orange", desc: "Zero or more (greedy)" },
    { re: /^\+/, color: "orange", desc: "One or more (greedy)" },
    { re: /^\?/, color: "orange", desc: "Zero or one (optional)" },
    { re: /^\|/, color: "indigo", desc: "Alternation (OR)" },
    { re: /^\./, color: "gray", desc: "Any character (except newline)" },
  ];

  while (i < pattern.length) {
    const remaining = pattern.slice(i);
    let matched = false;

    for (const rule of rules) {
      const m = remaining.match(rule.re);
      if (m) {
        tokens.push({ token: m[0], color: rule.color, desc: rule.desc, index: i });
        i += m[0].length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const ch = pattern[i];
      tokens.push({
        token: ch,
        color: "gray",
        desc: /[a-zA-Z0-9]/.test(ch) ? `Literal "${ch}"` : `Character "${ch}"`,
        index: i,
      });
      i++;
    }
  }

  return tokens;
}

const FLAGS_CONFIG = [
  { flag: "g", name: "Global", desc: "Find all matches (not just first)", shortcut: "⌘G" },
  { flag: "i", name: "Ignore case", desc: "Case-insensitive matching", shortcut: "⌘I" },
  { flag: "m", name: "Multiline", desc: "^ and $ match line boundaries", shortcut: "⌘M" },
  { flag: "s", name: "Dotall", desc: ". also matches \\n newlines", shortcut: "" },
  { flag: "u", name: "Unicode", desc: "Full Unicode support", shortcut: "" },
  { flag: "y", name: "Sticky", desc: "Match from lastIndex only", shortcut: "" },
];

const TOKEN_COLORS = {
  blue: "bg-blue-100 text-blue-800 border-blue-300",
  green: "bg-green-100 text-green-800 border-green-300",
  purple: "bg-purple-100 text-purple-800 border-purple-300",
  orange: "bg-orange-100 text-orange-800 border-orange-300",
  rose: "bg-rose-100 text-rose-800 border-rose-300",
  amber: "bg-amber-100 text-amber-800 border-amber-300",
  teal: "bg-teal-100 text-teal-800 border-teal-300",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-300",
  gray: "bg-gray-100 text-gray-700 border-gray-300",
};

const MATCH_COLORS = [
  "bg-yellow-200 text-yellow-900",
  "bg-blue-200 text-blue-900",
  "bg-green-200 text-green-900",
  "bg-purple-200 text-purple-900",
  "bg-orange-200 text-orange-900",
  "bg-pink-200 text-pink-900",
  "bg-teal-200 text-teal-900",
  "bg-red-200 text-red-900",
];

const SAMPLE_PATTERNS = [
  { label: "Email", pattern: "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}", flags: "gi", sample: "Contact: alice@example.com or bob.smith+tag@company.co.uk for help." },
  { label: "IP address", pattern: "\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b", flags: "g", sample: "Servers: 192.168.1.1, 10.0.0.1, 203.0.113.42, 256.0.0.1 (invalid)" },
  { label: "URL", pattern: "https?:\\/\\/[^\\s<>\"']+", flags: "gi", sample: "Visit https://devtools.app and http://example.com/path?q=1#section for details." },
  { label: "Date", pattern: "\\b(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b", flags: "g", sample: "Events: 2026-03-19, 2024-12-31, 2025-01-01. Invalid: 2024-13-01, 2024-00-15" },
  { label: "Hex color", pattern: "#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b", flags: "gi", sample: "CSS: color: #FF5733; background: #fff; border: 1px solid #A1B2C3; outline: #ab3;" },
  { label: "Named groups", pattern: "(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})", flags: "g", sample: "Dates: 2026-03-19, 2024-01-15, 2025-12-31" },
  { label: "Lookahead", pattern: "\\b\\w+(?=\\s+Street|\\s+Ave|\\s+Blvd)", flags: "gi", sample: "Address: 123 Main Street, 456 Oak Ave, 789 Sunset Blvd, 321 Pine Road" },
  { label: "Backreference", pattern: "\\b(\\w+)\\s+\\1\\b", flags: "gi", sample: "The the quick brown fox jumps over the lazy lazy dog. That that is is odd." },
];

function CopyButton({ text, label = "Copy" }) {
  const [state, setState] = useState("idle");
  async function handleCopy() {
    if (!text) return;
    const ok = await copyToClipboard(text);
    setState(ok ? "copied" : "error");
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors"
    >
      {state === "copied" ? (
        <>
          <Check width="12" height="12" />
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <Copy width="12" height="12" />
          {label}
        </>
      )}
    </button>
  );
}

function FlagButton({ flag, active, onToggle }) {
  const info = FLAGS_CONFIG.find((f) => f.flag === flag);
  return (
    <button
      onClick={() => onToggle(flag)}
      title={info ? `${info.name}: ${info.desc}` : flag}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono border cursor-pointer transition-all ${
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
      }`}
    >
      {flag}
      {info?.name && (
        <span className={`font-sans font-normal text-xs ${active ? "opacity-70" : "text-gray-400"}`}>
          {info.name}
        </span>
      )}
    </button>
  );
}

function PatternInput({ pattern, flags, onPatternChange, onFlagsChange, error, matchCount }) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center bg-white border-2 rounded-xl overflow-hidden transition-all ${
        error ? "border-red-300 shadow-red-100 shadow-sm" :
        pattern ? "border-blue-400 shadow-blue-100 shadow-sm" :
        "border-gray-200 focus-within:border-blue-400"
      }`}>
        <span className="px-4 py-3.5 text-gray-400 font-mono text-xl font-light select-none border-r border-gray-100">/</span>
        <input
          type="text"
          value={pattern}
          onChange={(e) => onPatternChange(e.target.value)}
          placeholder="Enter your regex pattern here…"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 px-4 py-3.5 text-base font-mono outline-none bg-transparent text-gray-900 placeholder:text-gray-300"
        />
        <span className="px-2 py-3.5 text-gray-400 font-mono text-xl font-light select-none">/</span>
        <span className="pr-4 py-3.5 text-blue-500 font-mono text-base font-bold select-none">
          {flags || <span className="text-gray-300">flags</span>}
        </span>
        {matchCount !== undefined && pattern && (
          <div className={`flex-shrink-0 mr-3 px-3 py-1 rounded-full text-xs font-bold ${
            matchCount > 0
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-gray-100 text-gray-500 border border-gray-200"
          }`}>
            {matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? "es" : ""}` : "no match"}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-gray-400 mr-1">Flags:</span>
        {FLAGS_CONFIG.map(({ flag }) => (
          <FlagButton
            key={flag}
            flag={flag}
            active={flags.includes(flag)}
            onToggle={(f) => onFlagsChange(flags.includes(f) ? flags.replace(f, "") : flags + f)}
          />
        ))}

        <div className="ml-auto flex items-center gap-1">
          {SAMPLE_PATTERNS.slice(0, 4).map((s) => (
            <button
              key={s.label}
              onClick={() => {
                onPatternChange(s.pattern);
                onFlagsChange(s.flags);
              }}
              className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 cursor-pointer transition-colors whitespace-nowrap"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="text-xs font-bold text-red-700">Invalid regex</p>
            <p className="text-xs font-mono text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightedTestArea({ value, onChange, matches, activeMatchIdx, onMatchClick, colorMode }) {
  const mirrorRef = useRef(null);
  const textareaRef = useRef(null);
  const containerRef = useRef(null);

  const segments = buildSegments(value, matches, activeMatchIdx);

  function handleScroll(e) {
    if (mirrorRef.current) {
      mirrorRef.current.scrollTop = e.target.scrollTop;
      mirrorRef.current.scrollLeft = e.target.scrollLeft;
    }
  }

  function getMatchColor(idx) {
    if (colorMode === "single") return "bg-yellow-200 text-yellow-900";
    return MATCH_COLORS[idx % MATCH_COLORS.length];
  }

  return (
    <div ref={containerRef} className="relative min-h-[280px]">
      <div
        ref={mirrorRef}
        aria-hidden="true"
        className="absolute inset-0 px-4 py-3.5 text-sm font-mono leading-relaxed whitespace-pre-wrap break-all overflow-auto pointer-events-none select-none"
        style={{ color: "transparent" }}
      >
        {segments.map((seg, i) => {
          if (seg.type === "plain") return <span key={i}>{seg.text}</span>;
          const color = getMatchColor(seg.matchIdx);
          return (
            <mark
              key={i}
              className={`rounded ${seg.active ? "bg-orange-400 text-orange-900" : color} not-italic`}
              style={{ color: "transparent" }}
            >
              {seg.text}
            </mark>
          );
        })}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={"Paste or type test text here…\n\nThe regex will match against this text in real-time.\nMatches are highlighted as you type."}
        spellCheck={false}
        autoCorrect="off"
        className="relative w-full h-full min-h-[280px] px-4 py-3.5 text-sm font-mono leading-relaxed bg-transparent outline-none resize-none caret-gray-900 overflow-auto placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
        style={{ color: "transparent", caretColor: "#111827", WebkitTextFillColor: "transparent" }}
      />

      <div
        className="absolute inset-0 px-4 py-3.5 text-sm font-mono leading-relaxed whitespace-pre-wrap break-all overflow-hidden pointer-events-none select-none"
        aria-hidden="true"
      >
        {segments.map((seg, i) => {
          if (seg.type === "plain") {
            return <span key={i} className="text-gray-700">{seg.text}</span>;
          }
          const color = getMatchColor(seg.matchIdx);
          return (
            <mark
              key={i}
              className={`rounded cursor-pointer not-italic font-semibold transition-colors ${
                seg.active ? "bg-orange-400 text-orange-900 ring-2 ring-orange-500" : color
              }`}
              style={{ pointerEvents: "all" }}
              onClick={() => onMatchClick(seg.matchIdx)}
            >
              {seg.text}
            </mark>
          );
        })}
      </div>
    </div>
  );
}

function PatternExplainer({ pattern }) {
  if (!pattern) return null;

  const tokens = explainRegex(pattern);
  if (tokens.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pattern Breakdown</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {tokens.map((tok, i) => (
            <span
              key={i}
              title={tok.desc}
              className={`inline-flex items-center px-2 py-1 rounded-lg border text-xs font-mono font-bold cursor-default transition-all hover:shadow-sm ${
                TOKEN_COLORS[tok.color] || TOKEN_COLORS.gray
              }`}
            >
              {tok.token}
            </span>
          ))}
        </div>

        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider w-24">Token</th>
                <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider">Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tokens.map((tok, i) => (
                <tr key={i} className="hover:bg-gray-50 cursor-default">
                  <td className="px-3 py-2">
                    <code className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${
                      TOKEN_COLORS[tok.color] || TOKEN_COLORS.gray
                    }`}>
                      {tok.token}
                    </code>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{tok.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MatchTable({ matches, groupNames, maxGroups, activeMatchIdx, onMatchSelect }) {
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;

  useEffect(() => {
    setPage(0);
  }, [matches]);

  if (matches.length === 0) return null;

  const start = page * PER_PAGE;
  const end = start + PER_PAGE;
  const visible = matches.slice(start, end);
  const pages = Math.ceil(matches.length / PER_PAGE);
  const numberedCols = maxGroups > 0 ? Array.from({ length: maxGroups }, (_, i) => `Group ${i + 1}`) : [];
  const namedCols = groupNames;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Match Table — {matches.length} match{matches.length !== 1 ? "es" : ""}
        </span>
        <div className="flex items-center gap-2">
          {matches.length > 0 && <CopyButton text={matches.map((m) => m.value).join("\n")} label="Export matches" />}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider w-10">#</th>
              <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider">Match</th>
              <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider w-20">Start</th>
              <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider w-16">Len</th>
              <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider w-16">Line</th>
              {numberedCols.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {col}
                </th>
              ))}
              {namedCols.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map((m, relIdx) => {
              const absIdx = start + relIdx;
              const isActive = absIdx === activeMatchIdx;
              return (
                <tr
                  key={absIdx}
                  onClick={() => onMatchSelect(absIdx)}
                  className={`cursor-pointer transition-colors ${
                    isActive ? "bg-orange-50 border-l-2 border-orange-400" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-3 py-2 font-bold text-blue-600">{absIdx + 1}</td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <code className={`font-mono font-bold px-1.5 py-0.5 rounded text-xs ${MATCH_COLORS[absIdx % MATCH_COLORS.length]}`}>
                      {m.value.length > 40 ? m.value.slice(0, 40) + "…" : m.value || <span className="opacity-50">(empty)</span>}
                    </code>
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-500">{m.index}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{m.length}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{m.line}</td>
                  {numberedCols.map((_, gi) => (
                    <td key={gi} className="px-3 py-2">
                      {m.numbered[gi] !== undefined ? (
                        <code className="font-mono text-purple-700 bg-purple-50 px-1 rounded text-xs">
                          {m.numbered[gi] || "(empty)"}
                        </code>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                  {namedCols.map((name) => (
                    <td key={name} className="px-3 py-2">
                      {m.namedGroups[name] !== undefined ? (
                        <code className="font-mono text-indigo-700 bg-indigo-50 px-1 rounded text-xs">
                          {m.namedGroups[name] || "(empty)"}
                        </code>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Showing {start + 1}–{Math.min(end, matches.length)} of {matches.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-300 transition-colors"
            >
              <ChevronLeft width="12" height="12" />
              Prev
            </button>
            <span className="text-xs text-gray-500 px-1">
              {page + 1} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-300 transition-colors"
            >
              Next
              <ChevronRight width="12" height="12" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchDetail({ match, idx, total }) {
  if (!match) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Match {idx + 1} of {total}</span>
        <CopyButton text={match.value} label="Copy value" />
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <span className="text-xs font-bold text-orange-600 w-14 flex-shrink-0 pt-0.5">Match</span>
          <code className="text-sm font-mono font-bold text-orange-900 break-all flex-1">
            {match.value || <span className="opacity-50">(empty string)</span>}
          </code>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Start index", value: match.index },
            { label: "End index", value: match.end },
            { label: "Length", value: match.length },
            { label: "Line", value: match.line },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="text-xs text-gray-400 font-medium">{label}</span>
              <span className="text-sm font-bold font-mono text-gray-800">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs">
          <span className="text-gray-400 flex-shrink-0">Context:</span>
          <span className="text-gray-500">…{match.context.before}</span>
          <mark className="bg-orange-300 text-orange-900 px-0.5 rounded not-italic font-bold">
            {match.value || "(empty)"}
          </mark>
          <span className="text-gray-500">{match.context.after}…</span>
        </div>

        {match.numbered.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Capture groups</p>
            <div className="space-y-1">
              {match.numbered.map((g, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-purple-50 border border-purple-100 rounded-lg">
                  <span className="text-xs font-bold text-purple-600 w-14 flex-shrink-0">Group {i + 1}</span>
                  <code className="text-xs font-mono text-purple-800 flex-1 break-all">
                    {g !== undefined ? (g || "(empty)") : "(undefined)"}
                  </code>
                  {g && <CopyButton text={g} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(match.namedGroups).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Named groups</p>
            <div className="space-y-1">
              {Object.entries(match.namedGroups).map(([name, val]) => (
                <div key={name} className="flex items-center gap-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <span className="text-xs font-bold text-indigo-600 w-28 flex-shrink-0 font-mono">&lt;{name}&gt;</span>
                  <code className="text-xs font-mono text-indigo-800 flex-1 break-all">
                    {val !== undefined ? (val || "(empty)") : "(undefined)"}
                  </code>
                  {val && <CopyButton text={val} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsBar({ result, testText }) {
  if (!result?.success || !testText) return null;

  const chars = testText.length;
  const lines = testText.split("\n").length;
  const words = testText.split(/\s+/).filter(Boolean).length;
  const matchCount = result.matches.length;
  const coverage = chars > 0 ? Math.round((result.matches.reduce((acc, m) => acc + m.length, 0) / chars) * 100) : 0;

  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {[
        { label: "Matches", value: matchCount.toLocaleString(), color: matchCount > 0 ? "text-green-600" : "text-gray-500" },
        { label: "Input chars", value: chars.toLocaleString(), color: "text-gray-700" },
        { label: "Lines", value: lines.toLocaleString(), color: "text-gray-700" },
        { label: "Words", value: words.toLocaleString(), color: "text-gray-700" },
        { label: "Coverage", value: `${coverage}%`, color: coverage > 0 ? "text-blue-600" : "text-gray-500" },
        { label: "Exec time", value: `${result.time}ms`, color: result.time < 1 ? "text-green-600" : result.time < 10 ? "text-amber-600" : "text-red-600" },
      ].map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className={`font-mono font-bold ${color}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function BenchmarkPanel({ pattern, flags, testText }) {
  const [benchResult, setBenchResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [iterations, setIterations] = useState(1000);

  function handleRun() {
    if (!pattern || !testText) return;
    setRunning(true);
    setBenchResult(null);

    setTimeout(() => {
      const result = benchmark(pattern, flags, testText, iterations);
      setBenchResult(result);
      setRunning(false);
    }, 50);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleRun}
          disabled={running || !pattern || !testText}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          {running ? (
            <>
              <svg width="14" height="14" className="animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running…
            </>
          ) : (
            <>
              <Zap width="14" height="14" />
              Run benchmark
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Iterations:</span>
          <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
            {[100, 500, 1000, 5000].map((n) => (
              <button
                key={n}
                onClick={() => setIterations(n)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  iterations === n ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {benchResult?.success && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Benchmark Results — {iterations.toLocaleString()} iterations
            </span>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Avg time", value: `${benchResult.avg}ms` },
              { label: "Median", value: `${benchResult.median}ms` },
              { label: "Fastest", value: `${benchResult.min}ms` },
              { label: "Slowest", value: `${benchResult.max}ms` },
              { label: "Total time", value: `${benchResult.total}ms` },
              { label: "Ops/second", value: benchResult.ops.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1 px-3 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-lg font-bold font-mono text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {benchResult?.success === false && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle width="14" height="14" className="text-red-500 flex-shrink-0" />
          <p className="text-xs font-mono text-red-700">{benchResult.error}</p>
        </div>
      )}
    </div>
  );
}

function UnitTestPanel({ pattern, flags }) {
  const [testCases, setTestCases] = useState([
    { id: 1, input: "", expectMatch: true, expectedValue: "", desc: "Should match" },
    { id: 2, input: "", expectMatch: false, expectedValue: "", desc: "Should NOT match" },
  ]);
  const [results, setResults] = useState([]);
  const [ran, setRan] = useState(false);

  function addCase(expectMatch) {
    setTestCases((prev) => [
      ...prev,
      { id: Date.now(), input: "", expectMatch, expectedValue: "", desc: expectMatch ? "Should match" : "Should NOT match" },
    ]);
    setRan(false);
  }

  function removeCase(id) {
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
    setRan(false);
  }

  function updateCase(id, field, value) {
    setTestCases((prev) => prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc)));
    setRan(false);
  }

  function handleRun() {
    const res = runTests(pattern, flags, testCases);
    setResults(res);
    setRan(true);
  }

  useEffect(() => {
    setRan(false);
  }, [pattern, flags]);

  const passing = results.filter((r) => r.status === "pass").length;
  const failing = results.filter((r) => r.status === "fail" || r.status === "error").length;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {testCases.map((tc, idx) => {
          const result = ran ? results[idx] : null;
          return (
            <div
              key={tc.id}
              className={`border rounded-xl overflow-hidden transition-colors ${
                result?.status === "pass" ? "border-green-300" :
                result?.status === "fail" || result?.status === "error" ? "border-red-300" :
                "border-gray-200"
              }`}
            >
              <div className={`flex items-center gap-3 px-4 py-2.5 ${
                result?.status === "pass" ? "bg-green-50" :
                result?.status === "fail" || result?.status === "error" ? "bg-red-50" :
                "bg-gray-50"
              }`}>
                {result ? (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    result.status === "pass" ? "bg-green-200" :
                    result.status === "fail" || result.status === "error" ? "bg-red-200" :
                    "bg-gray-200"
                  }`}>
                    {result.status === "pass" ? (
                      <Check width="10" height="10" className="text-green-600" />
                    ) : result.status === "skipped" ? (
                      <span className="text-xs text-gray-500">−</span>
                    ) : (
                      <X width="10" height="10" className="text-red-600" />
                    )}
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                )}

                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                    tc.expectMatch
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-red-100 text-red-700 border border-red-300"
                  }`}
                  onClick={() => updateCase(tc.id, "expectMatch", !tc.expectMatch)}
                  title="Click to toggle"
                >
                  {tc.expectMatch ? "should match" : "should not match"}
                </span>

                <input
                  type="text"
                  value={tc.desc}
                  onChange={(e) => updateCase(tc.id, "desc", e.target.value)}
                  placeholder="Description…"
                  className="flex-1 text-xs text-gray-600 bg-transparent outline-none placeholder:text-gray-300"
                />

                <button onClick={() => removeCase(tc.id)} className="text-xs text-gray-400 hover:text-red-500 cursor-pointer transition-colors">
                  <X width="12" height="12" />
                </button>
              </div>

              <div className="p-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={tc.input}
                  onChange={(e) => updateCase(tc.id, "input", e.target.value)}
                  placeholder="Test input string…"
                  spellCheck={false}
                  className="flex-1 min-w-[120px] px-3 py-2 text-xs font-mono bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 transition-colors placeholder:text-gray-300"
                />

                {tc.expectMatch && (
                  <input
                    type="text"
                    value={tc.expectedValue}
                    onChange={(e) => updateCase(tc.id, "expectedValue", e.target.value)}
                    placeholder="Expected match value (optional)…"
                    spellCheck={false}
                    className="flex-1 min-w-[120px] px-3 py-2 text-xs font-mono bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 transition-colors placeholder:text-gray-300"
                  />
                )}

                {result?.status === "fail" && (
                  <div className="w-full flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle width="12" height="12" className="flex-shrink-0 text-red-500" />
                    <p className="text-xs text-red-700 font-medium">{result.reason}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleRun}
          disabled={!pattern}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <Play width="14" height="14" />
          Run tests
        </button>

        <button
          onClick={() => addCase(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-lg cursor-pointer transition-colors"
        >
          <Plus width="12" height="12" />
          Add match case
        </button>

        <button
          onClick={() => addCase(false)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
        >
          <Plus width="12" height="12" />
          Add no-match case
        </button>

        {ran && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm ${
            failing === 0 ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {failing === 0 ? (
              <>
                <Check width="14" height="14" />
                All {passing} test{passing !== 1 ? "s" : ""} passed
              </>
            ) : (
              <>
                <X width="14" height="14" />
                {failing} failed, {passing} passed
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegexTester() {
  const [activeTab, setActiveTab] = useState("test");
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("gi");
  const [testText, setTestText] = useState("");
  const [result, setResult] = useState(null);
  const [activeMatchIdx, setActiveMatchIdx] = useState(-1);
  const [colorMode, setColorMode] = useState("multi");
  const [showTable] = useState(true);
  const [showDetail] = useState(true);
  const [showExplainer, setShowExplainer] = useState(false);
  const [activeSample, setActiveSample] = useState(null);

  useEffect(() => {
    if (!pattern) {
      setResult(null);
      setActiveMatchIdx(-1);
      return;
    }

    const t = setTimeout(() => {
      const res = runRegex(pattern, flags, testText);
      setResult(res);
      setActiveMatchIdx(-1);
    }, 100);

    return () => clearTimeout(t);
  }, [pattern, flags, testText]);

  function goToMatch(idx) {
    if (!result?.matches) return;
    const clamped = Math.max(0, Math.min(result.matches.length - 1, idx));
    setActiveMatchIdx(clamped);
  }

  function loadSample(sample) {
    setPattern(sample.pattern);
    setFlags(sample.flags);
    setTestText(sample.sample);
    setActiveMatchIdx(-1);
    setActiveSample(sample.label);
  }

  const TABS = [
    { value: "test", label: "Live Tester", icon: Activity },
    { value: "benchmark", label: "Benchmark", icon: Zap },
    { value: "unittest", label: "Unit Tests", icon: Layers },
  ];

  const matchCount = result?.success ? result.matches.length : undefined;
  const activeMatch = result?.matches?.[activeMatchIdx];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
                activeTab === tab.value
                  ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "benchmark" && <BenchmarkPanel pattern={pattern} flags={flags} testText={testText} />}
      {activeTab === "unittest" && <UnitTestPanel pattern={pattern} flags={flags} />}

      {activeTab === "test" && (
        <div className="space-y-5">
          <div className="space-y-3">
            <PatternInput
              pattern={pattern}
              flags={flags}
              onPatternChange={setPattern}
              onFlagsChange={setFlags}
              error={result?.error}
              matchCount={matchCount}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs font-medium text-gray-400 self-center mr-1">Samples:</span>
            {SAMPLE_PATTERNS.map((s) => (
              <button
                key={s.label}
                onClick={() => loadSample(s)}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors whitespace-nowrap ${
                  activeSample === s.label
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "text-blue-600 hover:bg-blue-50 border-blue-100"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            {result?.success && result.matches.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToMatch(activeMatchIdx - 1)}
                  disabled={activeMatchIdx <= 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-300 transition-colors"
                >
                  <ChevronLeft width="12" height="12" />
                  Prev
                </button>
                <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                  {activeMatchIdx >= 0 ? `${activeMatchIdx + 1} / ${result.matches.length}` : `${result.matches.length} match${result.matches.length !== 1 ? "es" : ""}`}
                </span>
                <button
                  onClick={() => goToMatch(activeMatchIdx + 1)}
                  disabled={activeMatchIdx >= result.matches.length - 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-300 transition-colors"
                >
                  Next
                  <ChevronRight width="12" height="12" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Highlight:</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                {[
                  { value: "multi", label: "Multi-color" },
                  { value: "single", label: "Single color" },
                ].map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setColorMode(m.value)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      colorMode === m.value ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 ml-auto flex-wrap">
              <button
                onClick={() => setShowExplainer((v) => !v)}
                className={`text-xs font-medium px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  showExplainer
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {showExplainer ? "Hide" : "Show"} explainer
              </button>

              <button
                onClick={() => {
                  setPattern("");
                  setTestText("");
                  setResult(null);
                  setActiveMatchIdx(-1);
                  setActiveSample(null);
                }}
                className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg cursor-pointer border border-gray-200 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Test Input</span>
                {testText && (
                  <span className="text-xs text-gray-400">
                    {testText.length.toLocaleString()} chars · {testText.split("\n").length} lines
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {testText && (
                  <button
                    onClick={() => {
                      setTestText("");
                      setResult(null);
                    }}
                    className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
                {testText && <CopyButton text={testText} label="Copy input" />}
              </div>
            </div>

            <div className="border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-white">
              <HighlightedTestArea
                value={testText}
                onChange={setTestText}
                matches={result?.success ? result.matches : []}
                activeMatchIdx={activeMatchIdx}
                onMatchClick={(idx) => setActiveMatchIdx(idx === activeMatchIdx ? -1 : idx)}
                colorMode={colorMode}
              />
            </div>
          </div>

          {result && <StatsBar result={result} testText={testText} />}

          {result?.truncated && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle width="14" height="14" className="text-amber-500" />
              <p className="text-xs text-amber-700 font-medium">
                More than 10,000 matches found — display truncated for performance.
              </p>
            </div>
          )}

          {showExplainer && pattern && !result?.error && <PatternExplainer pattern={pattern} />}

          {showTable && result?.success && result.matches.length > 0 && (
            <MatchTable
              matches={result.matches}
              groupNames={result.groupNames}
              maxGroups={result.maxGroups}
              activeMatchIdx={activeMatchIdx}
              onMatchSelect={(idx) => setActiveMatchIdx(idx === activeMatchIdx ? -1 : idx)}
            />
          )}

          {showDetail && activeMatch && (
            <MatchDetail match={activeMatch} idx={activeMatchIdx} total={result.matches.length} />
          )}

          {result?.success && result.matches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Export matches:</span>
              <CopyButton text={result.matches.map((m) => m.value).join("\n")} label="Copy all (newline)" />
              <CopyButton
                text={JSON.stringify(result.matches.map((m) => ({
                  match: m.value,
                  index: m.index,
                  end: m.end,
                  groups: m.numbered.filter(Boolean),
                  named: m.namedGroups,
                })), null, 2)}
                label="Copy as JSON"
              />
              <button
                onClick={() => downloadText(result.matches.map((m) => m.value).join("\n"), "matches.txt", "text/plain")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
              >
                <Download width="12" height="12" />
                Download .txt
              </button>
              <button
                onClick={() => downloadText(
                  ["match,index,end,length,line", ...result.matches.map((m) => `"${m.value.replace(/"/g, "\"\"")}",${m.index},${m.end},${m.length},${m.line}`)].join("\n"),
                  "matches.csv",
                  "text/csv",
                )}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
              >
                <Download width="12" height="12" />
                Download .csv
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}