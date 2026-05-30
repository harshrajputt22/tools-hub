"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ArrowRight,
  BadgeInfo,
  Braces,
  CaseSensitive,
  Check,
  FileCode2,
  FileJson,
  FileSearch,
  Link2,
  MessageSquareOff,
  Phone,
  Pilcrow,
  Quote,
  Replace,
  Search,
  Sparkles,
  Type,
  WandSparkles,
  Workflow,
  WrapText,
} from "lucide-react";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// REGEX REPLACE ENGINE
// Pure JS — handles: global/first replace, capture group refs,
// function replacements, case transforms, named groups,
// multi-pattern chains, diff view, undo history
// ============================================================

function performReplace(input, pattern, flags, replacement, options = {}) {
  const {
    mode = "all",
    nthOccurrence = 1,
    trimResult = false,
    collapseSpaces = false,
  } = options;

  if (!input && input !== "0") {
    return { success: false, error: "Input is empty.", output: "", count: 0 };
  }

  if (!pattern) {
    return { success: true, output: input, count: 0, matches: [] };
  }

  try {
    const countFlags = flags.includes("g") ? flags : flags + "g";

    const allMatches = [];
    let m;
    let lastIdx = -1;

    const scanRegex = new RegExp(pattern, countFlags);
    while ((m = scanRegex.exec(input)) !== null) {
      if (m.index === lastIdx) {
        scanRegex.lastIndex++;
        continue;
      }
      lastIdx = m.index;
      allMatches.push({
        index: m.index,
        end: m.index + m[0].length,
        match: m[0],
        groups: m.slice(1),
        namedGroups: m.groups || {},
        fullMatch: m,
      });
    }

    if (allMatches.length === 0) {
      return { success: true, output: input, count: 0, matches: [] };
    }

    function buildReplacement(matchObj) {
      let rep = replacement;

      rep = rep.replace(/\$<([^>]+)>/g, (_, name) => matchObj.namedGroups[name] ?? "");
      rep = rep.replace(/\$(\d{1,2})/g, (_, n) => {
        const idx = parseInt(n) - 1;
        return matchObj.groups[idx] ?? "";
      });
      rep = rep.replace(/\$&/g, matchObj.match);
      rep = rep.replace(/\$`/g, input.slice(0, matchObj.index));
      rep = rep.replace(/\$'/g, input.slice(matchObj.end));
      rep = rep.replace(/\$\$/g, "$");
      rep = applyCaseTransforms(rep);

      return rep;
    }

    let output;

    if (mode === "first") {
      const first = allMatches[0];
      output = input.slice(0, first.index) + buildReplacement(first) + input.slice(first.end);
    } else if (mode === "nth") {
      const nth = allMatches[nthOccurrence - 1];
      if (!nth) {
        return {
          success: true,
          output: input,
          count: 0,
          matches: allMatches,
          warning: `Occurrence ${nthOccurrence} not found (only ${allMatches.length} match${allMatches.length !== 1 ? "es" : ""}).`,
        };
      }
      output = input.slice(0, nth.index) + buildReplacement(nth) + input.slice(nth.end);
    } else {
      let result = "";
      let lastEnd = 0;

      for (const match of allMatches) {
        result += input.slice(lastEnd, match.index);
        result += buildReplacement(match);
        lastEnd = match.end;
      }

      result += input.slice(lastEnd);
      output = result;
    }

    if (trimResult) output = output.trim();
    if (collapseSpaces) output = output.replace(/\s{2,}/g, " ");

    return {
      success: true,
      output,
      count: mode === "all" ? allMatches.length : mode === "first" ? Math.min(1, allMatches.length) : 1,
      matches: allMatches,
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      output: "",
      count: 0,
      matches: [],
    };
  }
}

function applyCaseTransforms(rep) {
  rep = rep.replace(/\\u(.)/g, (_, ch) => ch.toUpperCase());
  rep = rep.replace(/\\l(.)/g, (_, ch) => ch.toLowerCase());
  rep = rep.replace(/\\U([\s\S]*?)\\E/g, (_, s) => s.toUpperCase());
  rep = rep.replace(/\\L([\s\S]*?)\\E/g, (_, s) => s.toLowerCase());
  rep = rep.replace(/\\t/g, "\t");
  rep = rep.replace(/\\n/g, "\n");
  return rep;
}

function performChain(input, chain) {
  let current = input;
  const steps = [];

  for (const step of chain) {
    if (!step.pattern.trim()) continue;

    const result = performReplace(current, step.pattern, step.flags, step.replacement, {
      mode: step.mode || "all",
    });

    steps.push({
      ...step,
      result,
      input: current,
      output: result.success ? result.output : current,
    });

    if (result.success) current = result.output;
  }

  return { output: current, steps };
}

function buildDiff(original, modified) {
  if (original.length > 5000 || modified.length > 5000) {
    return buildLineDiff(original, modified);
  }

  const ops = [];
  const a = original.split("\n");
  const b = modified.split("\n");

  let ai = 0;
  let bi = 0;

  while (ai < a.length || bi < b.length) {
    if (ai < a.length && bi < b.length && a[ai] === b[bi]) {
      ops.push({ type: "same", text: a[ai] });
      ai++;
      bi++;
    } else {
      let foundA = -1;
      let foundB = -1;

      for (let lookahead = 1; lookahead <= 5; lookahead++) {
        if (ai + lookahead < a.length && bi < b.length && a[ai + lookahead] === b[bi]) {
          foundA = lookahead;
          break;
        }
        if (ai < a.length && bi + lookahead < b.length && a[ai] === b[bi + lookahead]) {
          foundB = lookahead;
          break;
        }
      }

      if (foundA !== -1) {
        for (let k = 0; k < foundA; k++) ops.push({ type: "removed", text: a[ai++] });
      } else if (foundB !== -1) {
        for (let k = 0; k < foundB; k++) ops.push({ type: "added", text: b[bi++] });
      } else {
        if (ai < a.length) ops.push({ type: "removed", text: a[ai++] });
        if (bi < b.length) ops.push({ type: "added", text: b[bi++] });
      }
    }
  }

  return ops;
}

function buildLineDiff(original, modified) {
  const aLines = original.split("\n");
  const bLines = modified.split("\n");
  const ops = [];

  const aSet = new Set(aLines);
  const bSet = new Set(bLines);

  for (const line of aLines) {
    ops.push({ type: bSet.has(line) ? "same" : "removed", text: line });
  }

  for (const line of bLines) {
    if (!aSet.has(line)) ops.push({ type: "added", text: line });
  }

  return ops;
}

function analyzeReplacement(rep) {
  const refs = [];

  for (const m of rep.matchAll(/\$<([^>]+)>/g)) {
    refs.push({ type: "named", ref: `$<${m[1]}>`, name: m[1] });
  }

  for (const m of rep.matchAll(/\$(\d{1,2})/g)) {
    refs.push({ type: "numbered", ref: `$${m[1]}`, group: parseInt(m[1]) });
  }

  if (rep.includes("$&")) refs.push({ type: "special", ref: "$&", desc: "Full match" });
  if (rep.includes("$`")) refs.push({ type: "special", ref: "$`", desc: "Text before match" });
  if (rep.includes("$'")) refs.push({ type: "special", ref: "$'", desc: "Text after match" });
  if (rep.includes("$$")) refs.push({ type: "special", ref: "$$", desc: "Literal $" });
  if (rep.includes("\\u")) refs.push({ type: "transform", ref: "\\u", desc: "Uppercase next char" });
  if (rep.includes("\\l")) refs.push({ type: "transform", ref: "\\l", desc: "Lowercase next char" });
  if (rep.includes("\\U")) refs.push({ type: "transform", ref: "\\U...\\E", desc: "Uppercase block" });
  if (rep.includes("\\L")) refs.push({ type: "transform", ref: "\\L...\\E", desc: "Lowercase block" });

  return refs;
}

const FLAGS_INFO = [
  { flag: "g", name: "Global", desc: "Replace all occurrences" },
  { flag: "i", name: "Ignore case", desc: "Case-insensitive matching" },
  { flag: "m", name: "Multiline", desc: "^ and $ match line boundaries" },
  { flag: "s", name: "Dotall", desc: ". matches newlines" },
];

const REPLACEMENT_REFERENCES = [
  { ref: "$1 … $9", desc: "Capture group by number" },
  { ref: "$<name>", desc: "Named capture group" },
  { ref: "$&", desc: "Entire matched text" },
  { ref: "$`", desc: "Text before the match" },
  { ref: "$'", desc: "Text after the match" },
  { ref: "$$", desc: "Literal dollar sign" },
  { ref: "\\u", desc: "Uppercase next character" },
  { ref: "\\l", desc: "Lowercase next character" },
  { ref: "\\U…\\E", desc: "Uppercase until \\E" },
  { ref: "\\L…\\E", desc: "Lowercase until \\E" },
  { ref: "\\n", desc: "Newline in replacement" },
  { ref: "\\t", desc: "Tab in replacement" },
];

const PRESET_OPERATIONS = [
  {
    id: "camel-to-snake",
    label: "camelCase → snake_case",
    icon: CaseSensitive,
    pattern: "([a-z])([A-Z])",
    flags: "g",
    replacement: "$1_\\l$2",
    desc: "Convert camelCase identifiers to snake_case",
    sample: "getUserById processApiResponse handleFormSubmit",
  },
  {
    id: "snake-to-camel",
    label: "snake_case → camelCase",
    icon: Type,
    pattern: "_([a-z])",
    flags: "g",
    replacement: "\\u$1",
    desc: "Convert snake_case identifiers to camelCase",
    sample: "get_user_by_id process_api_response handle_form_submit",
  },
  {
    id: "trim-spaces",
    label: "Trim extra spaces",
    icon: WrapText,
    pattern: " {2,}",
    flags: "g",
    replacement: " ",
    desc: "Collapse multiple consecutive spaces to single space",
    sample: "This   has    way   too    many   spaces   between words",
  },
  {
    id: "remove-html",
    label: "Strip HTML tags",
    icon: Braces,
    pattern: "<[^>]+>",
    flags: "g",
    replacement: "",
    desc: "Remove all HTML tags leaving plain text",
    sample: "<p class=\"intro\">Hello <strong>World</strong>! <a href=\"/\">Click here</a>.</p>",
  },
  {
    id: "remove-comments",
    label: "Remove JS line comments",
    icon: MessageSquareOff,
    pattern: "\\/\\/[^\\n]*",
    flags: "gm",
    replacement: "",
    desc: "Strip single-line JavaScript comments",
    sample: "const x = 1; // this is a comment\nconst y = 2; // another comment\nconst z = 3;",
  },
  {
    id: "add-quotes",
    label: "Wrap words in quotes",
    icon: Quote,
    pattern: "(\\b\\w+\\b)",
    flags: "g",
    replacement: "\"$1\"",
    desc: "Wrap each word in double quotes",
    sample: "apple banana cherry date",
  },
  {
    id: "csv-to-json-keys",
    label: "CSV header → JSON keys",
    icon: FileJson,
    pattern: "([^,\\n]+)",
    flags: "g",
    replacement: "\"$1\"",
    desc: "Quote CSV column headers for JSON",
    sample: "name,age,email,city,country",
  },
  {
    id: "normalize-whitespace",
    label: "Normalize line endings",
    icon: Pilcrow,
    pattern: "\\r\\n|\\r",
    flags: "g",
    replacement: "\\n",
    desc: "Convert Windows/Mac line endings to Unix (LF)",
    sample: "Line 1\r\nLine 2\r\nLine 3\rLine 4",
  },
  {
    id: "phone-format",
    label: "Format phone number",
    icon: Phone,
    pattern: "(\\d{3})(\\d{3})(\\d{4})",
    flags: "g",
    replacement: "($1) $2-$3",
    desc: "Format 10-digit numbers as (XXX) XXX-XXXX",
    sample: "4155551234 2125559876 3105550000",
  },
  {
    id: "remove-blank-lines",
    label: "Remove blank lines",
    icon: FileCode2,
    pattern: "^[\\t ]*\\n",
    flags: "gm",
    replacement: "",
    desc: "Remove empty and whitespace-only lines",
    sample: "Line 1\n\nLine 3\n   \nLine 5\n\t\nLine 7",
  },
  {
    id: "indent-add",
    label: "Add 2-space indent",
    icon: ArrowRight,
    pattern: "^(?=.)",
    flags: "gm",
    replacement: "  ",
    desc: "Add 2 spaces at the start of each non-empty line",
    sample: "function hello() {\n  console.log('hi');\n  return true;\n}",
  },
  {
    id: "url-encode-spaces",
    label: "Encode spaces in URLs",
    icon: Link2,
    pattern: " ",
    flags: "g",
    replacement: "%20",
    desc: "Replace spaces with URL-encoded %20",
    sample: "my file name.pdf another document.docx",
  },
];

const SAMPLES = {
  code: `function getUserById(userId) {
  // Fetch user from database
  const userData = db.query("SELECT * FROM users WHERE id = ?", [userId]);
  if (!userData) {
    // User not found
    return null;
  }
  const userObject = {
    userId: userData.id,
    userName: userData.name,
    userEmail: userData.email,
    createdAt: userData.created_at,
  };
  return userObject;
}`,
  text: `The quick brown fox jumps over the lazy dog.
Pack my box with five dozen liquor jugs.
How vexingly quick daft zebras jump!

Contact us at: hello@example.com or support@devtools.app
Visit: https://devtools.app/tools or http://www.example.com

Phone numbers: 4155551234, 2125559876, 8005551234
Dates: 2024-03-19, 01/15/2024, 25-12-2025`,
  csv: `id,first_name,last_name,email,phone,city,created_at
1,Alice,Johnson,alice@example.com,415-555-1234,San Francisco,2024-01-15
2,Bob,Smith,bob@example.com,212-555-9876,New York,2024-02-20
3,Carol,Williams,carol@example.com,310-555-0000,Los Angeles,2024-03-01`,
  html: `<html>
  <head>
    <title>  My   Page  </title>
  </head>
  <body>
    <div class="container">
      <h1>  Hello   World  </h1>
      <p>  This has   extra   spaces  </p>
      <p>Visit <a href="https://example.com">Example</a> for more.</p>
    </div>
  </body>
</html>`,
};

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        title={description}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
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
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function PanelHeader({ label, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        {meta && <span className="text-xs text-gray-400 tabular-nums">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
      <BadgeInfo width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" />
      <p className="text-xs font-mono text-red-700 leading-relaxed break-all">{message}</p>
    </div>
  );
}

function FlagToggle({ flag, active, onToggle, info }) {
  return (
    <button
      onClick={() => onToggle(flag)}
      title={info ? `${info.name}: ${info.desc}` : flag}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono border cursor-pointer transition-all ${
        active ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
      }`}
    >
      {flag}
    </button>
  );
}

function ReplaceRow({
  pattern,
  flags,
  replacement,
  onPatternChange,
  onFlagsChange,
  onReplacementChange,
  error,
  matchCount,
  warning,
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Find (regex)</label>
        <div
          className={`flex items-center bg-white border-2 rounded-xl overflow-hidden transition-colors ${
            error ? "border-red-300" : pattern ? "border-blue-300" : "border-gray-200"
          }`}
        >
          <span className="px-3 text-gray-400 font-mono text-lg font-light select-none">/</span>
          <input
            type="text"
            value={pattern}
            onChange={(e) => onPatternChange(e.target.value)}
            placeholder="regex pattern…"
            spellCheck={false}
            autoCorrect="off"
            className="flex-1 px-1 py-3 text-sm font-mono outline-none bg-transparent text-gray-900 placeholder:text-gray-300"
          />
          <span className="px-1 text-gray-400 font-mono text-lg font-light select-none">/</span>
          <div className="flex items-center gap-1 px-3 border-l border-gray-200">
            {FLAGS_INFO.map(({ flag, name, desc }) => (
              <FlagToggle
                key={flag}
                flag={flag}
                active={flags.includes(flag)}
                info={{ name, desc }}
                onToggle={(f) => onFlagsChange(flags.includes(f) ? flags.replace(f, "") : flags + f)}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Replace with</label>
          {matchCount > 0 && <span className="text-xs font-bold text-green-600">{matchCount} match{matchCount !== 1 ? "es" : ""} found</span>}
          {matchCount === 0 && pattern && !error && <span className="text-xs font-semibold text-amber-600">No matches</span>}
        </div>
        <input
          type="text"
          value={replacement}
          onChange={(e) => onReplacementChange(e.target.value)}
          placeholder="replacement… ($1 $2 $& $\\` $\\' \\u \\U…\\E)"
          spellCheck={false}
          className="w-full px-4 py-3 text-sm font-mono bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-400 transition-colors placeholder:text-gray-300"
        />
      </div>

      {error && <ErrorBanner message={`Regex error: ${error}`} />}
      {warning && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <BadgeInfo width="13" height="13" className="flex-shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">{warning}</p>
        </div>
      )}
    </div>
  );
}

function DiffView({ original, modified }) {
  if (!original || !modified || original === modified) return null;

  const ops = buildDiff(original, modified);
  const added = ops.filter((o) => o.type === "added").length;
  const removed = ops.filter((o) => o.type === "removed").length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Diff View</span>
        <div className="flex items-center gap-2">
          {added > 0 && <span className="text-xs font-bold text-green-600">+{added} line{added !== 1 ? "s" : ""}</span>}
          {removed > 0 && <span className="text-xs font-bold text-red-600">−{removed} line{removed !== 1 ? "s" : ""}</span>}
        </div>
      </div>
      <div className="overflow-auto max-h-[400px] bg-gray-900">
        {ops.map((op, i) => (
          <div
            key={i}
            className={`flex items-start font-mono text-xs leading-relaxed px-4 py-0.5 ${
              op.type === "added" ? "bg-green-900/30 text-green-300" : op.type === "removed" ? "bg-red-900/30 text-red-300 line-through opacity-70" : "text-gray-400"
            }`}
          >
            <span className="w-5 flex-shrink-0 select-none text-center opacity-50 mr-2">
              {op.type === "added" ? "+" : op.type === "removed" ? "−" : " "}
            </span>
            <span className="flex-1 whitespace-pre-wrap break-all">{op.text || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchHighlight({ input, matches, maxChars = 2000 }) {
  if (!input || !matches || matches.length === 0) return null;

  const display = input.length > maxChars ? input.slice(0, maxChars) : input;
  const truncated = input.length > maxChars;
  const segments = [];
  let pos = 0;

  for (const m of matches) {
    if (m.index >= maxChars) break;
    if (m.index > pos) segments.push({ text: display.slice(pos, m.index), highlight: false });
    const end = Math.min(m.end, maxChars);
    segments.push({ text: display.slice(m.index, end), highlight: true });
    pos = end;
  }

  if (pos < display.length) segments.push({ text: display.slice(pos), highlight: false });

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Matches Highlighted in Input</span>
      </div>
      <div className="px-4 py-3 font-mono text-sm leading-relaxed bg-white max-h-[200px] overflow-auto whitespace-pre-wrap break-all">
        {segments.map((seg, i) =>
          seg.highlight ? (
            <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5 font-semibold not-italic">
              {seg.text}
            </mark>
          ) : (
            <span key={i} className="text-gray-700">{seg.text}</span>
          ),
        )}
        {truncated && <span className="text-gray-400 ml-1">… (showing first {maxChars} chars)</span>}
      </div>
    </div>
  );
}

function ReferencesPanel({ replacement }) {
  const refs = replacement ? analyzeReplacement(replacement) : [];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Replacement References</span>
      </div>
      <div className="p-4 space-y-3">
        {refs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Active in your replacement:</p>
            <div className="flex flex-wrap gap-1.5">
              {refs.map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-mono font-bold"
                  title={r.desc || r.name}
                >
                  {r.ref}
                  {r.desc && <span className="font-sans font-normal opacity-70">— {r.desc}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider w-28">Reference</th>
                <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-3 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {REPLACEMENT_REFERENCES.map(({ ref, desc }) => (
                <tr key={ref} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2">
                    <code className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {ref}
                    </code>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{desc}</td>
                  <td className="px-3 py-2">
                    <CopyButton text={ref} label="Use" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChainStep({ step, index, onChange, onRemove, preview }) {
  const [patternErr, setPatternErr] = useState(null);

  useEffect(() => {
    if (!step.pattern) {
      setPatternErr(null);
      return;
    }
    try {
      new RegExp(step.pattern, step.flags);
      setPatternErr(null);
    } catch (e) {
      setPatternErr(e.message);
    }
  }, [step.pattern, step.flags]);

  return (
    <div className={`border rounded-xl overflow-hidden ${patternErr ? "border-red-200" : "border-gray-200"}`}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-gray-600">Step {index + 1}</span>
          {preview?.result?.count > 0 && (
            <span className="text-xs text-green-600 font-semibold">
              {preview.result.count} replacement{preview.result.count !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg cursor-pointer transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
          <span className="px-3 text-gray-400 font-mono select-none">/</span>
          <input
            type="text"
            value={step.pattern}
            onChange={(e) => onChange({ ...step, pattern: e.target.value })}
            placeholder="find pattern…"
            spellCheck={false}
            className="flex-1 px-1 py-2 text-sm font-mono outline-none bg-transparent placeholder:text-gray-300"
          />
          <span className="px-1 text-gray-400 font-mono select-none">/</span>
          <div className="flex items-center gap-1 px-3 border-l border-gray-200">
            {["g", "i", "m"].map((f) => (
              <FlagToggle
                key={f}
                flag={f}
                active={step.flags.includes(f)}
                onToggle={(fl) =>
                  onChange({
                    ...step,
                    flags: step.flags.includes(fl) ? step.flags.replace(fl, "") : step.flags + fl,
                  })
                }
              />
            ))}
          </div>
        </div>

        <input
          type="text"
          value={step.replacement}
          onChange={(e) => onChange({ ...step, replacement: e.target.value })}
          placeholder={"replace with… ($1, $&, \\u, \\U…\\E)"}
          spellCheck={false}
          className="w-full px-4 py-2 text-sm font-mono bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-400 transition-colors placeholder:text-gray-300"
        />

        {patternErr && <ErrorBanner message={patternErr} />}

        {preview?.result?.output && preview.result.output !== preview.input && (
          <div className="text-xs">
            <span className="text-gray-400 font-semibold">Preview: </span>
            <code className="font-mono text-green-700 bg-green-50 px-1.5 py-0.5 rounded break-all">
              {preview.result.output.slice(0, 120)}
              {preview.result.output.length > 120 && "…"}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

function ReplaceSection({ sharedInput, sharedPattern, sharedFlags, sharedReplacement }) {
  const [input, setInput] = useState(sharedInput || "");
  const [pattern, setPattern] = useState(sharedPattern || "");
  const [flags, setFlags] = useState(sharedFlags || "g");
  const [replacement, setReplacement] = useState(sharedReplacement || "");
  const [mode, setMode] = useState("all");
  const [nthOccurrence, setNthOccurrence] = useState(1);
  const [trimResult, setTrimResult] = useState(false);
  const [collapseSpaces, setCollapseSpaces] = useState(false);
  const [showDiff, setShowDiff] = useState(true);
  const [showHighlight, setShowHighlight] = useState(true);
  const [showRefs, setShowRefs] = useState(false);
  const [autoReplace, setAutoReplace] = useState(true);
  const [activeSample, setActiveSample] = useState(null);
  const [result, setResult] = useState(null);
  const [patternError, setPatternError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  useEffect(() => {
    if (sharedInput !== undefined) setInput(sharedInput || "");
  }, [sharedInput]);

  useEffect(() => {
    if (sharedPattern !== undefined) setPattern(sharedPattern || "");
  }, [sharedPattern]);

  useEffect(() => {
    if (sharedFlags !== undefined) setFlags(sharedFlags || "g");
  }, [sharedFlags]);

  useEffect(() => {
    if (sharedReplacement !== undefined) setReplacement(sharedReplacement || "");
  }, [sharedReplacement]);

  useEffect(() => {
    if (!pattern) {
      setPatternError(null);
      return;
    }
    try {
      new RegExp(pattern, flags);
      setPatternError(null);
    } catch (e) {
      setPatternError(e.message);
    }
  }, [pattern, flags]);

  const handleReplace = useCallback(() => {
    if (!input.trim() && !input) {
      setResult(null);
      return;
    }

    const res = performReplace(input, pattern, flags, replacement, {
      mode,
      nthOccurrence,
      trimResult,
      collapseSpaces,
    });

    setResult(res);

    if (res.success && res.output !== input && res.count > 0) {
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIdx + 1 < 0 ? prev.length : historyIdx + 1);
        return [
          ...trimmed,
          {
            input,
            pattern,
            flags,
            replacement,
            output: res.output,
            count: res.count,
            timestamp: new Date().toLocaleTimeString(),
          },
        ].slice(-20);
      });
      setHistoryIdx((prev) => prev + 1);
    }
  }, [input, pattern, flags, replacement, mode, nthOccurrence, trimResult, collapseSpaces, historyIdx]);

  useEffect(() => {
    if (!autoReplace || patternError) return;
    const t = setTimeout(handleReplace, 300);
    return () => clearTimeout(t);
  }, [input, pattern, flags, replacement, mode, nthOccurrence, trimResult, collapseSpaces, autoReplace, handleReplace, patternError]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleReplace();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleReplace]);

  function handleUndo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setInput(prev.input);
    setPattern(prev.pattern);
    setFlags(prev.flags);
    setReplacement(prev.replacement);
    setHistory((h) => h.slice(0, -1));
    setResult(null);
  }

  function handleApply() {
    if (!result?.success || !result.output) return;
    setInput(result.output);
    setResult(null);
  }

  function loadPreset(preset) {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setReplacement(preset.replacement);
    setMode("all");
    if (preset.sample) setInput(preset.sample);
    setResult(null);
    setActiveSample(preset.id);
  }

  function loadSample(key) {
    setInput(SAMPLES[key]);
    setResult(null);
    setActiveSample(key);
  }

  function handleClear() {
    setInput("");
    setPattern("");
    setFlags("g");
    setReplacement("");
    setResult(null);
    setActiveSample(null);
  }

  const inputMeta = input ? `${input.length.toLocaleString()} chars · ${input.split("\n").length} lines` : null;
  const outputMeta = result?.output
    ? `${result.output.length.toLocaleString()} chars · ${result.output.split("\n").length} lines`
    : null;

  return (
    <div className="space-y-5">
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
        <ReplaceRow
          pattern={pattern}
          flags={flags}
          replacement={replacement}
          onPatternChange={setPattern}
          onFlagsChange={setFlags}
          onReplacementChange={setReplacement}
          error={patternError}
          matchCount={result?.success ? result.count : undefined}
          warning={result?.warning}
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Replace:</span>
            <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
              {[
                { value: "all", label: "All" },
                { value: "first", label: "First" },
                { value: "nth", label: "Nth" },
              ].map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    mode === m.value ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "nth" && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Occurrence:</span>
              <input
                type="number"
                value={nthOccurrence}
                min={1}
                onChange={(e) => setNthOccurrence(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1.5 text-xs font-mono bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-center"
              />
            </div>
          )}

          <Toggle checked={trimResult} onChange={setTrimResult} label="Trim result" />
          <Toggle checked={collapseSpaces} onChange={setCollapseSpaces} label="Collapse spaces" />
          <Toggle checked={autoReplace} onChange={setAutoReplace} label="Auto replace" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleReplace}
            data-primary="true"
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Replace width="15" height="15" />
            Replace
          </button>

          {result?.success && result.count > 0 && (
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg cursor-pointer transition-all"
            >
              <Check width="14" height="14" />
              Apply to input
            </button>
          )}

          {history.length > 0 && (
            <button
              onClick={handleUndo}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-lg cursor-pointer transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Undo
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Toggle checked={showDiff} onChange={setShowDiff} label="Diff view" />
            <Toggle checked={showHighlight} onChange={setShowHighlight} label="Highlights" />
            <Toggle checked={showRefs} onChange={setShowRefs} label="References" />
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">⌘</kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">↵</kbd>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <PanelHeader
            label="Input Text"
            meta={inputMeta}
            actions={
              <>
                <div className="flex items-center gap-1">
                  {Object.keys(SAMPLES).map((key) => (
                    <button
                      key={key}
                      onClick={() => loadSample(key)}
                      className={`text-xs font-medium px-2 py-1 rounded-lg border cursor-pointer transition-colors whitespace-nowrap ${
                        activeSample === key && !PRESET_OPERATIONS.find((p) => p.id === activeSample)
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "text-gray-500 hover:bg-gray-100 border-gray-200"
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                {input && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
              </>
            }
          />
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (result) setResult(null);
            }}
            placeholder="Paste text to search and replace…"
            spellCheck={false}
            autoCorrect="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[280px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        <div className="flex flex-col">
          <PanelHeader
            label="Result"
            meta={outputMeta}
            actions={
              <>
                {result?.output && result.count > 0 && <CopyButton text={result.output} />}
                {result?.output && result.count > 0 && (
                  <button
                    onClick={() => downloadText(result.output, "replaced.txt", "text/plain")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </button>
                )}
              </>
            }
          />
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[280px] relative">
            {result?.success && result.output !== undefined ? (
              <textarea
                value={result.output}
                readOnly
                spellCheck={false}
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[280px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                <Replace className="w-9 h-9 opacity-20 text-gray-400" />
                <p className="text-xs text-gray-300">Result appears here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {result?.success === false && <ErrorBanner message={result.error} />}

      {result?.success && result.count > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-sm font-semibold text-green-700">
            <Check width="14" height="14" />
            {result.count} replacement{result.count !== 1 ? "s" : ""} made
          </span>
          <span className="text-xs text-gray-400">
            {result.output.length.toLocaleString()} chars output
            {input.length !== result.output.length &&
              ` (${result.output.length > input.length ? "+" : ""}${(result.output.length - input.length).toLocaleString()} chars)`}
          </span>
        </div>
      )}

      {result?.success && result.count === 0 && pattern && !patternError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
          <BadgeInfo width="14" height="14" className="text-amber-500" />
          <p className="text-xs text-amber-700 font-medium">Pattern found no matches in the input text.</p>
        </div>
      )}

      {showHighlight && result?.matches?.length > 0 && <MatchHighlight input={input} matches={result.matches} />}
      {showDiff && result?.success && result.count > 0 && input !== result.output && <DiffView original={input} modified={result.output} />}
      {showRefs && <ReferencesPanel replacement={replacement} />}
    </div>
  );
}

function PresetsSection({ onApply }) {
  const [search, setSearch] = useState("");
  const [activePreset, setActivePreset] = useState(null);

  const filtered = search.trim()
    ? PRESET_OPERATIONS.filter(
        (p) =>
          p.label.toLowerCase().includes(search.toLowerCase()) ||
          p.desc.toLowerCase().includes(search.toLowerCase()),
      )
    : PRESET_OPERATIONS;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search width="15" height="15" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search operations… camel, strip, trim, format…"
          className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-400 transition-colors placeholder:text-gray-400"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((preset) => {
          const Icon = preset.icon;
          return (
            <div
              key={preset.id}
              className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
                activePreset === preset.id ? "border-blue-300 ring-2 ring-blue-100 shadow-sm" : "border-gray-200 hover:border-blue-200 hover:shadow-sm"
              }`}
              onClick={() => setActivePreset(activePreset === preset.id ? null : preset.id)}
            >
              <div className={`px-4 py-3 ${activePreset === preset.id ? "bg-blue-50" : "bg-white"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-blue-700" />
                  <p className={`text-sm font-bold ${activePreset === preset.id ? "text-blue-800" : "text-gray-800"}`}>
                    {preset.label}
                  </p>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{preset.desc}</p>
              </div>

              <div className="px-4 py-2 bg-gray-900 font-mono text-xs">
                <span className="text-gray-500">find: </span>
                <span className="text-green-400">/{preset.pattern}/{preset.flags}</span>
                <br />
                <span className="text-gray-500">replace: </span>
                <span className="text-yellow-400">{preset.replacement || "\"\""}</span>
              </div>

              {activePreset === preset.id && (
                <div className="px-4 py-3 bg-white border-t border-gray-100 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Sample input:</p>
                    <code className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1.5 rounded-lg block break-all">
                      {preset.sample?.slice(0, 80)}
                      {preset.sample?.length > 80 ? "…" : ""}
                    </code>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApply(preset);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all"
                  >
                    <WandSparkles width="13" height="13" />
                    Use this operation
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-3">
          <FileSearch className="w-8 h-8 opacity-30 text-gray-400" />
          <p className="text-sm text-gray-400">No operations match "{search}"</p>
        </div>
      )}
    </div>
  );
}

function ChainSection() {
  const [input, setInput] = useState("");
  const [chain, setChain] = useState([{ id: Date.now(), pattern: "", flags: "g", replacement: "" }]);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  function addStep() {
    setChain((prev) => [...prev, { id: Date.now(), pattern: "", flags: "g", replacement: "" }]);
  }

  function removeStep(id) {
    setChain((prev) => prev.filter((s) => s.id !== id));
  }

  function updateStep(id, updated) {
    setChain((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  function handleRun() {
    if (!input.trim()) return;
    setRunning(true);
    try {
      setResult(performChain(input, chain));
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (!input.trim()) return;
    const t = setTimeout(handleRun, 400);
    return () => clearTimeout(t);
  }, [input, chain]);

  const inputMeta = input ? `${input.length.toLocaleString()} chars` : null;
  const outputMeta = result ? `${result.output.length.toLocaleString()} chars` : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <PanelHeader
          label="Input Text"
          meta={inputMeta}
          actions={
            input && (
              <button
                onClick={() => {
                  setInput("");
                  setResult(null);
                }}
                className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                Clear
              </button>
            )
          }
        />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste text to process through the chain…"
          spellCheck={false}
          autoCorrect="off"
          className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[140px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
        />
      </div>

      <div className="space-y-3">
        {chain.map((step, idx) => (
          <ChainStep
            key={step.id}
            step={step}
            index={idx}
            onChange={(updated) => updateStep(step.id, updated)}
            onRemove={() => removeStep(step.id)}
            preview={result?.steps?.[idx]}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleRun}
          data-primary="true"
          disabled={running}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <Workflow width="15" height="15" />
          Run chain
        </button>

        <button
          onClick={addStep}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-lg cursor-pointer transition-colors"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add step
        </button>

        {chain.length > 1 && (
          <button
            onClick={() => setChain([{ id: Date.now(), pattern: "", flags: "g", replacement: "" }])}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg cursor-pointer transition-colors border border-gray-200"
          >
            Reset chain
          </button>
        )}
      </div>

      {result && (
        <div className="flex flex-col">
          <PanelHeader
            label="Chain Output"
            meta={outputMeta}
            actions={
              <>
                <CopyButton text={result.output} />
                <button
                  onClick={() => downloadText(result.output, "chain-result.txt", "text/plain")}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
              </>
            }
          />
          <textarea
            value={result.output}
            readOnly
            spellCheck={false}
            className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[140px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
          />
        </div>
      )}

      {result?.steps?.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Step Summary</span>
          </div>
          <div className="divide-y divide-gray-100">
            {result.steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-4 px-4 py-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <code className="text-xs font-mono text-gray-600">/{step.pattern}/{step.flags}</code>
                  <span className="mx-1.5 text-gray-400">→</span>
                  <code className="text-xs font-mono text-gray-600">{step.replacement || "\"\""}</code>
                </div>
                <span className={`text-xs font-bold whitespace-nowrap ${step.result.count > 0 ? "text-green-600" : "text-gray-400"}`}>
                  {step.result.count > 0 ? `${step.result.count} replaced` : "no match"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegexReplace() {
  const [activeTab, setActiveTab] = useState("replace");
  const [sharedPattern, setSharedPattern] = useState("");
  const [sharedFlags, setSharedFlags] = useState("g");
  const [sharedReplacement, setSharedReplacement] = useState("");
  const [sharedInput, setSharedInput] = useState("");

  const TABS = [
    { value: "replace", label: "Find & Replace", icon: Replace },
    { value: "presets", label: "Preset Ops", icon: Sparkles },
    { value: "chain", label: "Chain Mode", icon: Workflow },
  ];

  function handleApplyPreset(preset) {
    setSharedPattern(preset.pattern);
    setSharedFlags(preset.flags);
    setSharedReplacement(preset.replacement);
    if (preset.sample) setSharedInput(preset.sample);
    setActiveTab("replace");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
                activeTab === tab.value ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "replace" && (
        <ReplaceSection
          sharedInput={sharedInput}
          sharedPattern={sharedPattern}
          sharedFlags={sharedFlags}
          sharedReplacement={sharedReplacement}
        />
      )}
      {activeTab === "presets" && <PresetsSection onApply={handleApplyPreset} />}
      {activeTab === "chain" && <ChainSection />}
    </div>
  );
}