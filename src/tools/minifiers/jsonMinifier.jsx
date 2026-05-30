"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard, downloadText } from "@/lib/helpers";
import { Minimize2, Sparkles, Map, Scale ,Lock} from "lucide-react";

// ============================================================
// JSON MINIFIER ENGINE
// Pure JS — no external dependency
// Handles: objects, arrays, strings, numbers, booleans, null,
// nested structures, Unicode, special chars, duplicate keys,
// pretty-print, sort keys, path explorer, diff view
// ============================================================

// ── JSON Tokenizer for analysis ───────────────────────────────
const JT = {
  OBJECT_START:  "{",
  OBJECT_END:    "}",
  ARRAY_START:   "[",
  ARRAY_END:     "]",
  STRING:        "STRING",
  NUMBER:        "NUMBER",
  BOOLEAN:       "BOOLEAN",
  NULL:          "NULL",
  COLON:         "COLON",
  COMMA:         "COMMA",
  WHITESPACE:    "WHITESPACE",
};

// ── Core minifier ─────────────────────────────────────────────
function minifyJson(raw, options = {}) {
  const {
    sortKeys          = false,
    removeNulls       = false,
    removeEmpty       = false,   // remove empty strings, arrays, objects
    ensureAscii       = false,   // escape non-ASCII chars
    numberPrecision   = null,    // round numbers to N decimal places
    keyQuoteStyle     = "double",// double | preserve
    trimStrings       = false,   // trim string values
  } = options;

  if (!raw || !raw.trim()) {
    return { success: false, output: "", error: "Input is empty." };
  }

  try {
    // Parse first to validate
    const parsed = JSON.parse(raw);

    // Apply transformations
    const transformed = applyTransforms(parsed, {
      sortKeys,
      removeNulls,
      removeEmpty,
      numberPrecision,
      trimStrings,
    });

    // Serialize
    const output = serializeJson(transformed, {
      ensureAscii,
      keyQuoteStyle,
    });

    const saved    = raw.length - output.length;
    const savedPct = Math.max(0, Math.round((saved / raw.length) * 100));

    return {
      success: true,
      output,
      stats: analyzeJsonStructure(raw, output, parsed),
    };
  } catch (e) {
    return {
      success: false,
      output:  "",
      error:   formatJsonError(e, raw),
    };
  }
}

// ── Apply data transformations ────────────────────────────────
function applyTransforms(value, opts) {
  const { sortKeys, removeNulls, removeEmpty, numberPrecision, trimStrings } = opts;

  if (value === null) return value;

  if (typeof value === "number") {
    if (numberPrecision !== null && numberPrecision >= 0) {
      return parseFloat(value.toFixed(numberPrecision));
    }
    return value;
  }

  if (typeof value === "string") {
    return trimStrings ? value.trim() : value;
  }

  if (typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    let arr = value.map((item) => applyTransforms(item, opts));

    if (removeNulls) {
      arr = arr.filter((item) => item !== null);
    }

    if (removeEmpty) {
      arr = arr.filter((item) => {
        if (item === null || item === undefined) return false;
        if (typeof item === "string" && item.trim() === "") return false;
        if (Array.isArray(item) && item.length === 0) return false;
        if (typeof item === "object" && !Array.isArray(item) && Object.keys(item).length === 0) return false;
        return true;
      });
    }

    return arr;
  }

  if (typeof value === "object") {
    let keys = Object.keys(value);

    if (sortKeys) keys = keys.sort((a, b) => a.localeCompare(b));

    const result = {};
    for (const key of keys) {
      const transformed = applyTransforms(value[key], opts);

      if (removeNulls && transformed === null) continue;

      if (removeEmpty) {
        if (transformed === null || transformed === undefined) continue;
        if (typeof transformed === "string" && transformed.trim() === "") continue;
        if (Array.isArray(transformed) && transformed.length === 0) continue;
        if (typeof transformed === "object" && !Array.isArray(transformed) && Object.keys(transformed).length === 0) continue;
      }

      result[key] = transformed;
    }

    return result;
  }

  return value;
}

// ── Custom serializer ─────────────────────────────────────────
function serializeJson(value, opts = {}) {
  const { ensureAscii } = opts;

  function escapeString(str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
      const ch   = str[i];
      const code = str.charCodeAt(i);

      // Must-escape characters
      if (ch === '"')  { result += '\\"';  continue; }
      if (ch === "\\") { result += "\\\\"; continue; }
      if (ch === "\b") { result += "\\b";  continue; }
      if (ch === "\f") { result += "\\f";  continue; }
      if (ch === "\n") { result += "\\n";  continue; }
      if (ch === "\r") { result += "\\r";  continue; }
      if (ch === "\t") { result += "\\t";  continue; }

      // Control characters
      if (code < 0x20) {
        result += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }

      // Non-ASCII
      if (ensureAscii && code > 0x7E) {
        // Handle surrogate pairs
        if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
          const nextCode = str.charCodeAt(i + 1);
          if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
            const codePoint = 0x10000 + ((code - 0xD800) << 10) + (nextCode - 0xDC00);
            result += `\\u${code.toString(16).padStart(4, "0")}\\u${nextCode.toString(16).padStart(4, "0")}`;
            i++;
            continue;
          }
        }
        result += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }

      result += ch;
    }
    return `"${result}"`;
  }

  function serialize(val) {
    if (val === null)             return "null";
    if (val === true)             return "true";
    if (val === false)            return "false";
    if (typeof val === "number") {
      if (!isFinite(val)) return "null"; // JSON doesn't support Infinity/NaN
      return String(val);
    }
    if (typeof val === "string") return escapeString(val);
    if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      return "[" + val.map(serialize).join(",") + "]";
    }
    if (typeof val === "object") {
      const keys = Object.keys(val);
      if (keys.length === 0) return "{}";
      return "{" + keys.map((k) => `${escapeString(k)}:${serialize(val[k])}`).join(",") + "}";
    }
    return "null";
  }

  return serialize(value);
}

// ── Pretty printer ────────────────────────────────────────────
function prettyPrint(value, options = {}) {
  const {
    indentSize  = 2,
    useTabs     = false,
    sortKeys    = false,
    trailingNewline = false,
  } = options;

  if (!value && value !== 0 && value !== false && value !== null) {
    return { success: false, output: "", error: "Input is empty." };
  }

  const indent = useTabs ? "\t" : " ".repeat(indentSize);

  try {
    let parsed;
    if (typeof value === "string") {
      parsed = JSON.parse(value);
    } else {
      parsed = value;
    }

    if (sortKeys) {
      parsed = sortObjectKeys(parsed);
    }

    const output = JSON.stringify(parsed, null, indent);
    return {
      success: true,
      output:  trailingNewline ? output + "\n" : output,
    };
  } catch (e) {
    return { success: false, output: "", error: formatJsonError(e, value) };
  }
}

function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObjectKeys(obj[key]);
  }
  return sorted;
}

// ── Error formatter ───────────────────────────────────────────
function formatJsonError(e, raw) {
  const msg = e.message || "Invalid JSON";

  // Extract position from error message
  const posMatch = msg.match(/position (\d+)/i) || msg.match(/at (\d+)/i);
  if (posMatch && raw) {
    const pos   = parseInt(posMatch[1]);
    const lines = raw.slice(0, pos).split("\n");
    const line  = lines.length;
    const col   = lines[lines.length - 1].length + 1;

    // Show context
    const rawLines = raw.split("\n");
    const ctx = rawLines.slice(Math.max(0, line - 2), line + 1)
      .map((l, i) => `${(Math.max(0, line - 2) + i + 1).toString().padStart(3)}: ${l}`)
      .join("\n");

    return `${msg}\nLine ${line}, column ${col}.\n\nContext:\n${ctx}`;
  }

  return msg;
}

// ── JSON Structure analyzer ───────────────────────────────────
function analyzeJsonStructure(originalRaw, minifiedOutput, parsed) {
  const saved    = originalRaw.length - minifiedOutput.length;
  const savedPct = Math.max(0, Math.round((saved / originalRaw.length) * 100));

  let totalKeys   = 0;
  let totalValues = 0;
  let maxDepth    = 0;
  let stringCount = 0;
  let numberCount = 0;
  let boolCount   = 0;
  let nullCount   = 0;
  let arrayCount  = 0;
  let objectCount = 0;
  let maxStrLen   = 0;

  function traverse(val, depth = 0) {
    maxDepth = Math.max(maxDepth, depth);

    if (val === null)              { nullCount++;   totalValues++; return; }
    if (typeof val === "boolean")  { boolCount++;   totalValues++; return; }
    if (typeof val === "number")   { numberCount++; totalValues++; return; }
    if (typeof val === "string")   {
      stringCount++;
      totalValues++;
      maxStrLen = Math.max(maxStrLen, val.length);
      return;
    }
    if (Array.isArray(val)) {
      arrayCount++;
      for (const item of val) traverse(item, depth + 1);
      return;
    }
    if (typeof val === "object") {
      objectCount++;
      const keys = Object.keys(val);
      totalKeys += keys.length;
      for (const key of keys) traverse(val[key], depth + 1);
    }
  }

  traverse(parsed);

  // Duplicate key detection in original raw
  const dupeKeys = detectDuplicateKeys(originalRaw);

  // Whitespace savings
  const wsOrig  = (originalRaw.match(/\s/g) || []).length;
  const wsMin   = (minifiedOutput.match(/\s/g) || []).length;
  const wsSaved = Math.max(0, wsOrig - wsMin);

  return {
    inputLength:   originalRaw.length,
    outputLength:  minifiedOutput.length,
    saved,
    savedPct,
    inputLines:    originalRaw.split("\n").length,
    gzipEstimate:  Math.round(minifiedOutput.length * 0.28),
    totalKeys,
    totalValues:   totalValues + arrayCount + objectCount,
    maxDepth,
    stringCount,
    numberCount,
    boolCount,
    nullCount,
    arrayCount,
    objectCount,
    maxStrLen,
    dupeKeys,
    whitespace:    wsSaved,
  };
}

// ── Duplicate key detection ───────────────────────────────────
function detectDuplicateKeys(raw) {
  const dupes = [];

  try {
    // Walk through raw tokens looking for object keys
    function findDupes(src, offset = 0) {
      let i = 0;
      while (i < src.length) {
        if (src[i] === "{") {
          i++;
          const keys = [];
          let depth = 1;
          while (i < src.length && depth > 0) {
            // Skip whitespace
            while (i < src.length && /\s/.test(src[i])) i++;

            if (src[i] === "}") { depth--; i++; break; }
            if (src[i] === "{") { depth++; i++; continue; }
            if (src[i] === "[") {
              // Skip array
              let ad = 1; i++;
              while (i < src.length && ad > 0) {
                if (src[i] === "[") ad++;
                if (src[i] === "]") ad--;
                i++;
              }
              continue;
            }

            // Read key
            if (src[i] === '"') {
              let key = "";
              i++;
              while (i < src.length && src[i] !== '"') {
                if (src[i] === "\\" && i + 1 < src.length) { i += 2; continue; }
                key += src[i++];
              }
              i++; // closing quote

              if (keys.includes(key)) dupes.push(key);
              else keys.push(key);

              // Skip : value
              while (i < src.length && src[i] !== "," && src[i] !== "}") i++;
              if (src[i] === ",") i++;
            } else {
              i++;
            }
          }
        } else {
          i++;
        }
      }
    }

    findDupes(raw);
  } catch {
    // ignore
  }

  return [...new Set(dupes)];
}

// ── JSON path explorer ────────────────────────────────────────
function buildPathMap(parsed, prefix = "$") {
  const paths = [];

  function traverse(val, path, depth = 0) {
    if (depth > 50) return; // prevent stack overflow on deep structures

    const typeOf = val === null ? "null"
      : Array.isArray(val) ? "array"
      : typeof val;

    if (typeOf === "object" || typeOf === "array") {
      paths.push({ path, type: typeOf, childCount: typeOf === "array" ? val.length : Object.keys(val).length });

      if (typeOf === "array") {
        val.slice(0, 100).forEach((item, idx) => { // limit to 100 items
          traverse(item, `${path}[${idx}]`, depth + 1);
        });
        if (val.length > 100) {
          paths.push({ path: `${path}[...]`, type: "truncated", childCount: val.length - 100 });
        }
      } else {
        const keys = Object.keys(val).slice(0, 100); // limit to 100 keys
        for (const key of keys) {
          traverse(val[key], `${path}.${key}`, depth + 1);
        }
        if (Object.keys(val).length > 100) {
          paths.push({ path: `${path}...`, type: "truncated", childCount: Object.keys(val).length - 100 });
        }
      }
    } else {
      const displayVal = typeOf === "string"
        ? val.length > 60 ? `"${val.slice(0, 60)}…"` : `"${val}"`
        : String(val);

      paths.push({ path, type: typeOf, value: displayVal });
    }
  }

  traverse(parsed, prefix);
  return paths;
}

// ── Diff engine ───────────────────────────────────────────────
function diffJson(objA, objB, path = "$") {
  const diffs = [];

  function compare(a, b, p) {
    // Same type check
    const typeA = a === null ? "null" : Array.isArray(a) ? "array" : typeof a;
    const typeB = b === null ? "null" : Array.isArray(b) ? "array" : typeof b;

    if (typeA !== typeB) {
      diffs.push({ path: p, type: "type_changed", from: typeA, to: typeB, fromVal: a, toVal: b });
      return;
    }

    if (typeA === "object") {
      const keysA = new Set(Object.keys(a));
      const keysB = new Set(Object.keys(b));

      for (const key of keysA) {
        if (!keysB.has(key)) {
          diffs.push({ path: `${p}.${key}`, type: "removed", fromVal: a[key] });
        } else {
          compare(a[key], b[key], `${p}.${key}`);
        }
      }

      for (const key of keysB) {
        if (!keysA.has(key)) {
          diffs.push({ path: `${p}.${key}`, type: "added", toVal: b[key] });
        }
      }
      return;
    }

    if (typeA === "array") {
      const maxLen = Math.max(a.length, b.length);
      for (let i = 0; i < Math.min(maxLen, 50); i++) {
        if (i >= a.length) {
          diffs.push({ path: `${p}[${i}]`, type: "added",   toVal:   b[i] });
        } else if (i >= b.length) {
          diffs.push({ path: `${p}[${i}]`, type: "removed", fromVal: a[i] });
        } else {
          compare(a[i], b[i], `${p}[${i}]`);
        }
      }
      if (maxLen > 50) {
        diffs.push({ path: `${p}[...]`, type: "truncated", count: maxLen - 50 });
      }
      return;
    }

    // Primitive comparison
    if (a !== b) {
      diffs.push({ path: p, type: "changed", fromVal: a, toVal: b });
    }
  }

  compare(objA, objB, path);
  return diffs;
}

// ── Size analysis breakdown ───────────────────────────────────
function buildSizeBreakdown(stats) {
  const total     = stats.inputLength;
  const keyBytes  = stats.totalKeys * 3; // rough: key + quotes + colon
  const wsBytes   = stats.whitespace;
  const otherBytes= Math.max(0, stats.saved - wsBytes);

  return {
    whitespace:  wsBytes,
    structural:  Math.max(0, otherBytes),
    total:       stats.saved,
  };
}

// ============================================================
// CONSTANTS
// ============================================================

const PRESETS = {
  minify: {
    label:          "Minify",
    desc:           "Remove all whitespace — smallest possible output",
    icon:           Minimize2,
    color:          "text-blue-700 bg-blue-50 border-blue-200",
    sortKeys:       false,
    removeNulls:    false,
    removeEmpty:    false,
    ensureAscii:    false,
    numberPrecision:null,
    trimStrings:    false,
  },
  clean: {
    label:          "Clean",
    desc:           "Minify + sort keys alphabetically for diffing",
    icon:           Sparkles,
    color:          "text-green-700 bg-green-50 border-green-200",
    sortKeys:       true,
    removeNulls:    false,
    removeEmpty:    false,
    ensureAscii:    false,
    numberPrecision:null,
    trimStrings:    true,
  },
  strict: {
    label:          "Strict",
    desc:           "Minify + remove nulls, empty values + sort keys",
    icon:           Lock,
    color:          "text-purple-700 bg-purple-50 border-purple-200",
    sortKeys:       true,
    removeNulls:    true,
    removeEmpty:    true,
    ensureAscii:    false,
    numberPrecision:null,
    trimStrings:    true,
  },
};



const INDENT_OPTIONS = [
  { value: 2,     label: "2 spaces" },
  { value: 4,     label: "4 spaces" },
  { value: "tab", label: "Tabs"     },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Toggle ────────────────────────────────────────────────────
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
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`} />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );
}

// ── Copy button ───────────────────────────────────────────────
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
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
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

// ── Panel header ──────────────────────────────────────────────
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

// ── Error banner ──────────────────────────────────────────────
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
      <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <pre className="text-xs font-mono text-red-700 leading-relaxed break-all whitespace-pre-wrap">{message}</pre>
    </div>
  );
}

function PresetSelector({ active, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {Object.entries(PRESETS).map(([key, p]) => {
        const Icon = p.icon;

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left cursor-pointer transition-all ${
              active === key
                ? `${p.color} ring-2 shadow-sm`
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Icon size={20} className="flex-shrink-0" />
            <div>
              <p className={`text-sm font-bold ${active === key ? "" : "text-gray-700"}`}>
                {p.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                {p.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Size card ─────────────────────────────────────────────────
function SizeCard({ stats }) {
  if (!stats) return null;

  const miniPct   = Math.round((stats.outputLength / stats.inputLength) * 100);
  const bytesOrig = stats.inputLength;
  const bytesMin  = stats.outputLength;

  function fmt(b) {
    if (b < 1024) return `${b} B`;
    return `${(b / 1024).toFixed(1)} KB`;
  }

  const breakdown = {
    whitespace: stats.whitespace,
    other:      Math.max(0, stats.saved - stats.whitespace),
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Size Reduction
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-bold text-green-700">
          <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {stats.savedPct}% smaller
        </span>
      </div>

      {/* Progress bars */}
      <div className="px-5 py-4 space-y-3 bg-white">
        {[
          { label: "Original",   size: stats.inputLength,  bytes: bytesOrig, pct: 100,     bar: "bg-gray-300",  tc: "text-gray-600"  },
          { label: "Minified",   size: stats.outputLength, bytes: bytesMin,  pct: miniPct, bar: "bg-green-500", tc: "text-green-600" },
          { label: "~Gzip est.", size: stats.gzipEstimate, bytes: null,      pct: Math.round(stats.gzipEstimate / stats.inputLength * 100), bar: "bg-blue-400", tc: "text-blue-600" },
        ].map(({ label, size, bytes, pct, bar, tc }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500 font-medium">{label}</span>
              <span className={`font-mono font-bold ${tc}`}>
                {size.toLocaleString()} chars
                {bytes != null && ` · ${fmt(bytes)}`}
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Savings breakdown
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Whitespace removed",     value: `${breakdown.whitespace.toLocaleString()} chars`, color: "text-blue-600 bg-blue-50 border-blue-200"     },
            { label: "Structural chars saved",  value: `${breakdown.other.toLocaleString()} chars`,     color: "text-purple-600 bg-purple-50 border-purple-200" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`px-3 py-2.5 rounded-xl border ${color}`}>
              <p className="text-xs font-medium opacity-70">{label}</p>
              <p className="text-sm font-bold font-mono mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-gray-100">
        {[
          { label: "Saved chars",  value: stats.saved.toLocaleString()      },
          { label: "Saved bytes",  value: fmt(bytesOrig - bytesMin)          },
          { label: "Input lines",  value: stats.inputLines.toLocaleString()  },
          { label: "JSON keys",    value: stats.totalKeys.toLocaleString()   },
        ].map(({ label, value }) => (
          <div key={label} className="px-5 py-3 border-r border-gray-100 last:border-r-0">
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className="text-sm font-bold font-mono text-gray-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Duplicate key warning */}
      {stats.dupeKeys?.length > 0 && (
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-200">
          <div className="flex items-start gap-2">
            <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-amber-700">Duplicate keys detected</p>
              <p className="text-xs text-amber-600 mt-0.5">
                The following keys appear more than once (last value wins):{" "}
                {stats.dupeKeys.map((k) => (
                  <code key={k} className="font-mono bg-amber-100 px-1 rounded mx-0.5">{k}</code>
                ))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Structure analysis ────────────────────────────────────────
function StructurePanel({ stats }) {
  if (!stats) return null;

  const typeData = [
    { label: "Objects",  value: stats.objectCount, color: "text-blue-600",   icon: "{}" },
    { label: "Arrays",   value: stats.arrayCount,  color: "text-indigo-600", icon: "[]" },
    { label: "Strings",  value: stats.stringCount, color: "text-green-600",  icon: '"a"'},
    { label: "Numbers",  value: stats.numberCount, color: "text-amber-600",  icon: "1" },
    { label: "Booleans", value: stats.boolCount,   color: "text-purple-600", icon: "T" },
    { label: "Nulls",    value: stats.nullCount,   color: "text-gray-500",   icon: "∅" },
    { label: "Keys",     value: stats.totalKeys,   color: "text-teal-600",   icon: "K" },
    { label: "Max depth",value: stats.maxDepth,    color: "text-rose-600",   icon: "⬇" },
  ];

  const maxVal = Math.max(...typeData.map((d) => d.value), 1);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Structure Analysis
        </span>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {typeData.map(({ label, value, color, icon }) => (
          <div key={label} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
            <span className={`text-sm font-bold font-mono flex-shrink-0 w-6 text-center ${color}`}>
              {icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium truncate">{label}</p>
              <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Type distribution bars */}
      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Value type distribution
        </p>
        <div className="space-y-1.5">
          {[
            { label: "strings",  value: stats.stringCount, color: "bg-green-400"  },
            { label: "numbers",  value: stats.numberCount, color: "bg-amber-400"  },
            { label: "objects",  value: stats.objectCount, color: "bg-blue-400"   },
            { label: "arrays",   value: stats.arrayCount,  color: "bg-indigo-400" },
            { label: "booleans", value: stats.boolCount,   color: "bg-purple-400" },
            { label: "nulls",    value: stats.nullCount,   color: "bg-gray-300"   },
          ].filter((d) => d.value > 0).map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-500 w-16 flex-shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full`}
                  style={{ width: `${(value / maxVal) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-8 text-right font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Max string length */}
      {stats.maxStrLen > 0 && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Longest string:</span>
              <span className="font-mono font-semibold text-gray-700">{stats.maxStrLen} chars</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Total values:</span>
              <span className="font-mono font-semibold text-gray-700">{stats.totalValues}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Options panel ─────────────────────────────────────────────
function OptionsPanel({ opts, onChange }) {
  const options = [
    {
      key:  "sortKeys",
      label:"Sort keys",
      desc: "Sort object keys alphabetically (recursively through all nested objects)",
      risk: "safe",
    },
    {
      key:  "removeNulls",
      label:"Remove null values",
      desc: 'Remove all key-value pairs where the value is null ({"key": null} → omitted)',
      risk: "caution",
    },
    {
      key:  "removeEmpty",
      label:"Remove empty values",
      desc: 'Remove empty strings "", empty arrays [], empty objects {} from output',
      risk: "caution",
    },
    {
      key:  "trimStrings",
      label:"Trim string values",
      desc: 'Trim leading/trailing whitespace from all string values: "  hello  " → "hello"',
      risk: "caution",
    },
    {
      key:  "ensureAscii",
      label:"Ensure ASCII output",
      desc: "Escape all non-ASCII characters to \\uXXXX sequences for maximum compatibility",
      risk: "safe",
    },
  ];

  const riskColors = { safe: "text-green-600", caution: "text-amber-600" };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map(({ key, label, desc, risk }) => (
        <div
          key={key}
          onClick={() => onChange(key, !opts[key])}
          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
            opts[key]
              ? "bg-blue-50 border-blue-200"
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}
        >
          <button
            role="switch"
            aria-checked={opts[key]}
            onClick={(e) => { e.stopPropagation(); onChange(key, !opts[key]); }}
            className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 cursor-pointer focus:outline-none mt-0.5 ${
              opts[key] ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
              opts[key] ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-xs font-semibold ${opts[key] ? "text-blue-800" : "text-gray-700"}`}>
                {label}
              </p>
              <span className={`text-xs font-medium ${riskColors[risk]}`}>
                ({risk})
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
          </div>
        </div>
      ))}

      {/* Number precision */}
      <div
        className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border col-span-full sm:col-span-1 ${
          opts.numberPrecision !== null
            ? "bg-blue-50 border-blue-200"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className={`text-xs font-semibold ${opts.numberPrecision !== null ? "text-blue-800" : "text-gray-700"}`}>
                Number precision
              </p>
              <span className="text-xs font-medium text-amber-600">(caution)</span>
            </div>
            <Toggle
              checked={opts.numberPrecision !== null}
              onChange={(v) => onChange("numberPrecision", v ? 2 : null)}
              label=""
              description="Enable number precision rounding"
            />
          </div>
          <p className="text-xs text-gray-400 leading-snug">
            Round numbers to N decimal places: 98.567891 → 98.57 (precision 2)
          </p>
          {opts.numberPrecision !== null && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 font-medium">Decimals:</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                {[0, 1, 2, 3, 4, 6].map((n) => (
                  <button
                    key={n}
                    onClick={(e) => { e.stopPropagation(); onChange("numberPrecision", n); }}
                    className={`px-2 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      opts.numberPrecision === n
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Line numbers ──────────────────────────────────────────────
function LineNumbers({ text }) {
  if (!text) return null;
  const count = text.split("\n").length;
  return (
    <div
      className="select-none text-right pr-3 pt-3.5 pb-3.5 text-xs font-mono text-gray-300 leading-relaxed bg-gray-50 border-r border-gray-200 min-w-[44px] overflow-hidden flex-shrink-0"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i + 1} className="leading-relaxed">{i + 1}</div>
      ))}
    </div>
  );
}

// ── Pretty print panel ────────────────────────────────────────
function PrettyPrintPanel({ input, indentSize }) {
  const [sortKeys,  setSortKeys]  = useState(false);
  const [output,    setOutput]    = useState("");
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!input.trim()) { setOutput(""); setError(null); return; }
    const result = prettyPrint(input, {
      indentSize: indentSize === "tab" ? 2 : indentSize,
      useTabs:    indentSize === "tab",
      sortKeys,
    });
    if (result.success) { setOutput(result.output); setError(null); }
    else { setOutput(""); setError(result.error); }
  }, [input, indentSize, sortKeys]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
        <svg width="15" height="15" className="flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
        </svg>
        <p className="text-xs text-blue-700">
          Pretty-prints minified JSON with consistent indentation. Use the input panel to the left.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <Toggle
          checked={sortKeys}
          onChange={setSortKeys}
          label="Sort keys"
          description="Sort all object keys alphabetically"
        />
        {output && <CopyButton text={output} label="Copy formatted" />}
        {output && (
          <button
            onClick={() => downloadText(output, "formatted.json", "application/json")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors border border-gray-200"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download .json
          </button>
        )}
      </div>

      <ErrorBanner message={error} />

      {output && (
        <div className="flex flex-col">
          <PanelHeader
            label="Pretty-printed JSON"
            meta={`${output.length.toLocaleString()} chars · ${output.split("\n").length} lines`}
          />
          <textarea
            value={output}
            readOnly
            spellCheck={false}
            className="w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[400px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
          />
        </div>
      )}
    </div>
  );
}

// ── Path explorer panel ───────────────────────────────────────
function PathExplorerPanel({ input }) {
  const [paths,   setPaths]   = useState([]);
  const [filter,  setFilter]  = useState("");
  const [error,   setError]   = useState(null);
  const [expanded,setExpanded]= useState(new Set(["$"]));

  useEffect(() => {
    if (!input.trim()) { setPaths([]); setError(null); return; }
    try {
      const parsed = JSON.parse(input);
      setPaths(buildPathMap(parsed));
      setError(null);
    } catch (e) {
      setError(formatJsonError(e, input));
      setPaths([]);
    }
  }, [input]);

  const filtered = filter
    ? paths.filter((p) => p.path.toLowerCase().includes(filter.toLowerCase()))
    : paths;

  const typeColors = {
    object:    "text-blue-600 bg-blue-50 border-blue-200",
    array:     "text-indigo-600 bg-indigo-50 border-indigo-200",
    string:    "text-green-700 bg-green-50 border-green-200",
    number:    "text-amber-700 bg-amber-50 border-amber-200",
    boolean:   "text-purple-700 bg-purple-50 border-purple-200",
    null:      "text-gray-500 bg-gray-50 border-gray-200",
    truncated: "text-gray-400 bg-gray-50 border-gray-100",
  };

  const typeIcons = {
    object:  "{}",
    array:   "[]",
    string:  '"',
    number:  "#",
    boolean: "T",
    null:    "∅",
    truncated: "…",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
        <svg width="15" height="15" className="flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-xs text-blue-700">
          Explores all JSONPath locations in the document. Filter by path to find specific keys or values.
          Supports up to 100 keys/items per level.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg width="14" height="14" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter paths… e.g. address, [0], email"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-400 transition-colors placeholder:text-gray-400"
          />
        </div>
        {filter && (
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {filtered.length} of {paths.length} paths
          </span>
        )}
      </div>

      <ErrorBanner message={error} />

      {/* Path list */}
      {filtered.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {paths.length} paths found
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {filtered.slice(0, 500).map((item, idx) => {
              const depth  = (item.path.match(/\./g) || []).length + (item.path.match(/\[/g) || []).length;
              const indent = Math.min(depth, 10) * 16;
              const tc     = typeColors[item.type] || typeColors.null;
              const icon   = typeIcons[item.type]  || "?";

              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 px-4 py-2 hover:bg-gray-50 transition-colors cursor-default"
                  style={{ paddingLeft: `${16 + indent}px` }}
                >
                  {/* Type badge */}
                  <span className={`inline-flex items-center justify-center w-6 h-5 flex-shrink-0 text-xs font-bold font-mono rounded border mt-0.5 ${tc}`}>
                    {icon}
                  </span>

                  {/* Path */}
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono text-gray-700 break-all">
                      {item.path}
                    </code>
                    {item.childCount != null && (
                      <span className="ml-2 text-xs text-gray-400">
                        ({item.childCount} {item.type === "array" ? "items" : "keys"})
                      </span>
                    )}
                    {item.value != null && (
                      <div className="text-xs text-gray-500 mt-0.5 break-all font-mono">
                        {item.value}
                      </div>
                    )}
                    {item.type === "truncated" && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        … {item.childCount} more items not shown
                      </div>
                    )}
                  </div>

                  {/* Copy path button */}
                  <CopyButton text={item.path} label="Path" />
                </div>
              );
            })}
            {filtered.length > 500 && (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">
                Showing 500 of {filtered.length} paths. Use the filter to narrow results.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!error && paths.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-3">
          <span className="text-3xl opacity-30">🗺️</span>
          <p className="text-sm font-semibold text-gray-400">Paste JSON in the input panel to explore paths</p>
        </div>
      )}
    </div>
  );
}

// ── Diff panel ────────────────────────────────────────────────
function DiffPanel() {
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [diffs,  setDiffs]  = useState(null);
  const [error,  setError]  = useState(null);

  function handleDiff() {
    if (!inputA.trim() || !inputB.trim()) {
      setError("Please paste JSON in both inputs.");
      setDiffs(null);
      return;
    }
    try {
      const parsedA = JSON.parse(inputA);
      const parsedB = JSON.parse(inputB);
      setDiffs(diffJson(parsedA, parsedB));
      setError(null);
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`);
      setDiffs(null);
    }
  }

  useEffect(() => {
    if (!inputA.trim() || !inputB.trim()) return;
    const t = setTimeout(handleDiff, 500);
    return () => clearTimeout(t);
  }, [inputA, inputB]);

  const diffTypeConfig = {
    added:        { label: "Added",        color: "bg-green-50 border-green-200 text-green-700",  icon: "+" },
    removed:      { label: "Removed",      color: "bg-red-50 border-red-200 text-red-700",        icon: "−" },
    changed:      { label: "Changed",      color: "bg-amber-50 border-amber-200 text-amber-700",  icon: "~" },
    type_changed: { label: "Type changed", color: "bg-purple-50 border-purple-200 text-purple-700",icon:"T" },
    truncated:    { label: "Truncated",    color: "bg-gray-50 border-gray-200 text-gray-500",     icon: "…" },
  };

  function formatVal(val) {
    if (val === null)           return "null";
    if (typeof val === "object") return Array.isArray(val) ? `[…${val.length}]` : `{…${Object.keys(val).length}}`;
    if (typeof val === "string") return val.length > 40 ? `"${val.slice(0, 40)}…"` : `"${val}"`;
    return String(val);
  }

  const summary = diffs ? {
    added:   diffs.filter((d) => d.type === "added").length,
    removed: diffs.filter((d) => d.type === "removed").length,
    changed: diffs.filter((d) => d.type === "changed" || d.type === "type_changed").length,
  } : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
        <svg width="15" height="15" className="flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-xs text-blue-700">
          Compares two JSON documents and shows added, removed, and changed paths.
          Auto-updates as you type. Handles deeply nested structures up to 50 array items.
        </p>
      </div>

      {/* Summary badges */}
      {summary && (
        <div className="flex items-center gap-2 flex-wrap">
          {summary.added > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-50 border border-green-200 text-green-700 rounded-lg">
              + {summary.added} added
            </span>
          )}
          {summary.removed > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 border border-red-200 text-red-700 rounded-lg">
              − {summary.removed} removed
            </span>
          )}
          {summary.changed > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700 rounded-lg">
              ~ {summary.changed} changed
            </span>
          )}
          {diffs?.length === 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-50 border border-green-300 text-green-800 rounded-lg">
              ✓ No differences — JSON documents are identical
            </span>
          )}
        </div>
      )}

      {/* Two inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { label: "JSON A (original)", value: inputA, onChange: setInputA },
          { label: "JSON B (modified)", value: inputB, onChange: setInputB },
        ].map(({ label, value, onChange }) => (
          <div key={label} className="flex flex-col">
            <PanelHeader
              label={label}
              meta={value ? `${value.length.toLocaleString()} chars` : null}
              actions={
                value && (
                  <button
                    onClick={() => { onChange(""); setDiffs(null); }}
                    className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )
              }
            />
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Paste ${label.split(" ")[1]} JSON...`}
              spellCheck={false}
              autoCorrect="off"
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[200px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
            />
          </div>
        ))}
      </div>

      <ErrorBanner message={error} />

      {/* Diff results */}
      {diffs && diffs.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {diffs.length} difference{diffs.length !== 1 ? "s" : ""} found
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {diffs.map((diff, idx) => {
              const cfg = diffTypeConfig[diff.type] || diffTypeConfig.changed;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 px-4 py-3 ${diff.type === "added" ? "bg-green-50/30" : diff.type === "removed" ? "bg-red-50/30" : ""}`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-5 text-xs font-bold rounded border flex-shrink-0 mt-0.5 ${cfg.color}`}>
                    {cfg.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono font-semibold text-gray-700 break-all">
                      {diff.path}
                    </code>
                    <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                      {diff.type === "added" && (
                        <p>
                          <span className="text-green-600 font-semibold">Added: </span>
                          <code className="font-mono">{formatVal(diff.toVal)}</code>
                        </p>
                      )}
                      {diff.type === "removed" && (
                        <p>
                          <span className="text-red-600 font-semibold">Removed: </span>
                          <code className="font-mono">{formatVal(diff.fromVal)}</code>
                        </p>
                      )}
                      {(diff.type === "changed" || diff.type === "type_changed") && (
                        <p>
                          <code className="font-mono text-red-500 line-through mr-2">{formatVal(diff.fromVal)}</code>
                          <span className="text-gray-400 mr-2">→</span>
                          <code className="font-mono text-green-600">{formatVal(diff.toVal)}</code>
                        </p>
                      )}
                      {diff.type === "truncated" && (
                        <p className="text-gray-400">… {diff.count} more differences not shown</p>
                      )}
                    </div>
                  </div>
                  <CopyButton text={diff.path} label="Path" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JsonMinifierTool() {
  const [activeTab,    setActiveTab]    = useState("minify");
  const [input,        setInput]        = useState("");
  const [output,       setOutput]       = useState("");
  const [error,        setError]        = useState(null);
  const [stats,        setStats]        = useState(null);
  const [preset,       setPreset]       = useState("minify");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showStructure,setShowStructure]= useState(false);
  const [showLines,    setShowLines]    = useState(false);
  const [autoMinify,   setAutoMinify]   = useState(true);
  const [activeSample, setActiveSample] = useState(null);
  const [indentSize,   setIndentSize]   = useState(2);
  const [opts, setOpts] = useState({ ...PRESETS.minify });

const TABS = [
  { value: "minify",  label: "Minify",       icon: Minimize2 },
  { value: "pretty",  label: "Pretty Print", icon: Sparkles },
  { value: "explore", label: "Path Explorer",icon: Map },
  { value: "diff",    label: "Diff",         icon: Scale },
];
  function handlePresetChange(key) {
    setPreset(key);
    setOpts({ ...PRESETS[key] });
    if (input.trim() && output) { setOutput(""); setStats(null); }
  }

  function handleOptChange(key, value) {
    setOpts((prev) => ({ ...prev, [key]: value }));
    setPreset("custom");
  }

  // ── Process ──────────────────────────────────────────────────
  const handleMinify = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Please enter JSON to minify.");
      setOutput(""); setStats(null);
      return;
    }
    const result = minifyJson(trimmed, opts);
    if (result.success) {
      setOutput(result.output);
      setError(null);
      setStats(result.stats);
    } else {
      setOutput("");
      setError(result.error);
      setStats(null);
    }
  }, [input, opts]);

  // Auto minify
  useEffect(() => {
    if (!autoMinify || !input.trim()) return;
    const t = setTimeout(handleMinify, 300);
    return () => clearTimeout(t);
  }, [input, autoMinify, handleMinify]);

  // Re-run on option change
  useEffect(() => {
    if (input.trim() && output) handleMinify();
  }, [opts]);

  // Ctrl+Enter
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleMinify();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleMinify]);

  function handleClear() {
    setInput(""); setOutput(""); setError(null);
    setStats(null); setActiveSample(null);
  }

  function loadSample(key) {
    setInput(SAMPLES[key]); setOutput("");
    setError(null); setStats(null); setActiveSample(key);
  }

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars · ${input.split("\n").length} lines` : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars` : null;

  return (
    <div className="space-y-5">

      {/* ── Top tabs ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl flex-wrap sm:flex-nowrap">
  {TABS.map((tab) => {
    const Icon = tab.icon;

    return (
      <button
        key={tab.value}
        onClick={() => setActiveTab(tab.value)}
        className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex-1 justify-center min-w-0 ${
          activeTab === tab.value
            ? "bg-white text-blue-700 shadow-sm border border-gray-200"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Icon size={16} className="flex-shrink-0" />
        <span className="truncate">{tab.label}</span>
      </button>
    );
  })}
</div>

      {/* ── Non-minify tabs ───────────────────────────────────── */}
      {activeTab === "pretty"  && <PrettyPrintPanel input={input} indentSize={indentSize} />}
      {activeTab === "explore" && <PathExplorerPanel input={input} />}
      {activeTab === "diff"    && <DiffPanel />}

      {/* ── Minify tab ────────────────────────────────────────── */}
      {activeTab === "minify" && (
        <>
          {/* Preset selector */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Minification mode
            </p>
            <PresetSelector active={preset} onChange={handlePresetChange} />
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <button
              onClick={handleMinify}
              data-primary="true"
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Minify JSON
            </button>

            <Toggle
              checked={autoMinify}
              onChange={setAutoMinify}
              label="Auto minify"
              description="Minify automatically as you type (300ms delay)"
            />
            <Toggle
              checked={showLines}
              onChange={setShowLines}
              label="Line numbers"
              description="Show line numbers on input"
            />
            <Toggle
              checked={showStructure}
              onChange={setShowStructure}
              label="Structure"
              description="Show JSON structure analysis"
            />

            {/* Indent for pretty */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Indent:</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                {INDENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setIndentSize(opt.value)}
                    title="Used by Pretty Print tab"
                    className={`px-2 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      indentSize === opt.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                showAdvanced
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {showAdvanced ? "Hide options" : "Advanced options"}
            </button>

            {/* Kbd hint */}
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">↵</kbd>
            </div>
          </div>

          {/* Advanced options */}
          {showAdvanced && (
            <div className="space-y-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Data transformations
              </p>
              <OptionsPanel opts={opts} onChange={handleOptChange} />

              {/* Caution note */}
              {(opts.removeNulls || opts.removeEmpty || opts.trimStrings || opts.numberPrecision !== null) && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl mt-2">
                  <svg width="13" height="13" className="flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-amber-700">
                    <strong>Data modifications active:</strong> Options marked "caution" change the data content, not just formatting.
                    The minified output may differ semantically from the input. Verify the result before use in production.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Two-panel layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Input */}
            <div className="flex flex-col">
              <PanelHeader
                label="JSON Input"
                meta={inputMeta}
                actions={
                  input && (
                    <button
                      onClick={handleClear}
                      className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  )
                }
              />
              <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden min-h-[400px]">
                {showLines && input && <LineNumbers text={input} />}
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
                  placeholder={`Paste JSON to minify...\n\nSupports:\n• Objects, arrays, nested structures\n• Unicode strings and escape sequences\n• Numbers (int, float, hex, exponent)\n• Boolean and null values\n• Deeply nested data\n\nAlso available in other tabs:\n• Pretty print with indent options\n• JSONPath explorer\n• Diff two JSON documents`}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white outline-none resize-none min-h-[400px] focus:outline-none placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
                />
              </div>
            </div>

            {/* Output */}
            <div className="flex flex-col">
              <PanelHeader
                label="Minified JSON"
                meta={outputMeta}
                actions={
                  <>
                    {output && <CopyButton text={output} />}
                    {output && (
                      <button
                        onClick={() => downloadText(output, "minified.json", "application/json")}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
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
              <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[400px] relative">
                {output ? (
                  <textarea
                    value={output}
                    readOnly
                    spellCheck={false}
                    className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[400px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <p className="text-xs text-gray-300">Minified JSON appears here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          <ErrorBanner message={error} />

          {/* Size card */}
          {stats && output && <SizeCard stats={stats} />}

          {/* Structure analysis */}
          {showStructure && stats && <StructurePanel stats={stats} />}
        </>
      )}
    </div>
  );
}