"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard, downloadText } from "@/lib/helpers";
import { ShieldCheck, Sparkles, Rocket } from "lucide-react";
import { Minimize2, Search } from "lucide-react";
// ============================================================
// JAVASCRIPT MINIFIER ENGINE
// Pure JS — no external dependency
// Handles: ES2022+, classes, arrow fns, template literals,
// destructuring, async/await, imports/exports, regex literals
// ============================================================

// ── Token types ───────────────────────────────────────────────
const TT = {
  KEYWORD:       "KEYWORD",
  IDENTIFIER:    "IDENTIFIER",
  NUMBER:        "NUMBER",
  STRING:        "STRING",
  TEMPLATE:      "TEMPLATE",
  REGEX:         "REGEX",
  OPERATOR:      "OPERATOR",
  PUNCTUATION:   "PUNCTUATION",
  COMMENT_LINE:  "COMMENT_LINE",
  COMMENT_BLOCK: "COMMENT_BLOCK",
  WHITESPACE:    "WHITESPACE",
  NEWLINE:       "NEWLINE",
};

const JS_KEYWORDS = new Set([
  "break","case","catch","class","const","continue","debugger",
  "default","delete","do","else","export","extends","finally",
  "for","function","if","import","in","instanceof","let","new",
  "of","return","static","super","switch","this","throw","try",
  "typeof","var","void","while","with","yield","async","await",
  "from","as","get","set","target","constructor","prototype",
]);

// ── Tokenizer ─────────────────────────────────────────────────
function tokenizeJs(src) {
  const tokens = [];
  let i = 0;
  let lastMeaningful = null;

  function peek(n = 1) { return src[i + n]; }

  function readString(quote) {
    let s = quote; i++;
    while (i < src.length) {
      const ch = src[i];
      if (ch === "\\" && i + 1 < src.length) { s += ch + src[i + 1]; i += 2; continue; }
      if (ch === quote) { s += ch; i++; break; }
      s += ch; i++;
    }
    return s;
  }

  function readTemplate() {
    let s = "`"; i++;
    let depth = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === "\\" && i + 1 < src.length) { s += ch + src[i + 1]; i += 2; continue; }
      if (ch === "$" && src[i + 1] === "{") { s += "${"; i += 2; depth++; continue; }
      if (ch === "}" && depth > 0) { s += "}"; i++; depth--; continue; }
      if (ch === "`" && depth === 0) { s += "`"; i++; break; }
      s += ch; i++;
    }
    return s;
  }

  function readLineComment() {
    let s = "//"; i += 2;
    while (i < src.length && src[i] !== "\n") s += src[i++];
    return s;
  }

  function readBlockComment() {
    let s = "/*"; i += 2;
    while (i < src.length) {
      if (src[i] === "*" && src[i + 1] === "/") { s += "*/"; i += 2; break; }
      s += src[i++];
    }
    return s;
  }

  function readNumber() {
    let s = "";
    // Hex
    if (src[i] === "0" && (src[i + 1] === "x" || src[i + 1] === "X")) {
      s = src[i] + src[i + 1]; i += 2;
      while (i < src.length && /[0-9a-fA-F_]/.test(src[i])) s += src[i++];
      return s;
    }
    // Binary
    if (src[i] === "0" && (src[i + 1] === "b" || src[i + 1] === "B")) {
      s = src[i] + src[i + 1]; i += 2;
      while (i < src.length && /[01_]/.test(src[i])) s += src[i++];
      return s;
    }
    // Octal
    if (src[i] === "0" && (src[i + 1] === "o" || src[i + 1] === "O")) {
      s = src[i] + src[i + 1]; i += 2;
      while (i < src.length && /[0-7_]/.test(src[i])) s += src[i++];
      return s;
    }
    while (i < src.length && /[0-9._]/.test(src[i])) s += src[i++];
    if (i < src.length && (src[i] === "e" || src[i] === "E")) {
      s += src[i++];
      if (i < src.length && (src[i] === "+" || src[i] === "-")) s += src[i++];
      while (i < src.length && /[0-9]/.test(src[i])) s += src[i++];
    }
    if (i < src.length && src[i] === "n") s += src[i++]; // BigInt
    return s;
  }

  function isRegexStart() {
    if (!lastMeaningful) return true;
    const t = lastMeaningful;
    if (t.type === TT.PUNCTUATION) {
      return ["(","[","{","}",";",",","!","&","|","?",":",
              "=","+","-","*","%","~","^","<",">"].includes(t.value);
    }
    if (t.type === TT.KEYWORD) {
      return ["return","typeof","instanceof","in","of","delete",
              "throw","new","void","case","yield","await"].includes(t.value);
    }
    return false;
  }

  function readRegex() {
    let s = "/"; i++;
    let inClass = false;
    while (i < src.length) {
      const ch = src[i];
      if (ch === "\\" && i + 1 < src.length) { s += ch + src[i + 1]; i += 2; continue; }
      if (ch === "[")  { inClass = true;  s += ch; i++; continue; }
      if (ch === "]")  { inClass = false; s += ch; i++; continue; }
      if (ch === "/" && !inClass) { s += ch; i++; break; }
      s += ch; i++;
    }
    // Flags
    while (i < src.length && /[gimsuy]/.test(src[i])) s += src[i++];
    return s;
  }

  while (i < src.length) {
    const ch = src[i];

    // Newlines
    if (ch === "\n" || ch === "\r") {
      tokens.push({ type: TT.NEWLINE, value: ch }); i++;
      continue;
    }

    // Whitespace
    if (/[ \t]/.test(ch)) {
      let ws = "";
      while (i < src.length && /[ \t]/.test(src[i])) ws += src[i++];
      tokens.push({ type: TT.WHITESPACE, value: ws });
      continue;
    }

    // Line comment
    if (ch === "/" && peek() === "/") {
      const val = readLineComment();
      tokens.push({ type: TT.COMMENT_LINE, value: val });
      continue;
    }

    // Block comment
    if (ch === "/" && peek() === "*") {
      const val = readBlockComment();
      // Preserve /*! license comments
      const isLicense = val.startsWith("/*!");
      tokens.push({
        type:      TT.COMMENT_BLOCK,
        value:     val,
        isLicense,
      });
      continue;
    }

    // Regex
    if (ch === "/" && isRegexStart()) {
      const val = readRegex();
      const tok = { type: TT.REGEX, value: val };
      tokens.push(tok); lastMeaningful = tok;
      continue;
    }

    // Strings
    if (ch === '"' || ch === "'") {
      const val = readString(ch);
      const tok = { type: TT.STRING, value: val };
      tokens.push(tok); lastMeaningful = tok;
      continue;
    }

    // Template literals
    if (ch === "`") {
      const val = readTemplate();
      const tok = { type: TT.TEMPLATE, value: val };
      tokens.push(tok); lastMeaningful = tok;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(peek()))) {
      const val = readNumber();
      const tok = { type: TT.NUMBER, value: val };
      tokens.push(tok); lastMeaningful = tok;
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-Z_$]/.test(ch)) {
      let id = "";
      while (i < src.length && /[a-zA-Z0-9_$]/.test(src[i])) id += src[i++];
      const type = JS_KEYWORDS.has(id) ? TT.KEYWORD : TT.IDENTIFIER;
      const tok  = { type, value: id };
      tokens.push(tok); lastMeaningful = tok;
      continue;
    }

    // Multi-char operators (longest match first)
    const MULTI_OPS = [
      "===","!==",">>>","**=","&&=","||=","??=","<<=",">>=",
      "==","!=","<=",">=","=>","**","++","--","&&","||","??",
      "+=","-=","*=","/=","%=","&=","|=","^=","<<",">>","?.",
      "...",
    ];
    let matched = false;
    for (const op of MULTI_OPS) {
      if (src.slice(i, i + op.length) === op) {
        const tok = { type: TT.OPERATOR, value: op };
        tokens.push(tok); lastMeaningful = tok;
        i += op.length; matched = true; break;
      }
    }
    if (matched) continue;

    // Single char
    const PUNCT = new Set("(){}[];,.:?~");
    const OPS   = new Set("=<>!&|^+-%*/");
    const tok   = {
      type:  PUNCT.has(ch) ? TT.PUNCTUATION : OPS.has(ch) ? TT.OPERATOR : TT.PUNCTUATION,
      value: ch,
    };
    tokens.push(tok); lastMeaningful = tok;
    i++;
  }

  return tokens;
}

// ── ASI (Automatic Semicolon Insertion) detector ─────────────
// Returns true if a newline between two tokens requires a ;
function needsAsi(prevTok, nextTok) {
  if (!prevTok || !nextTok) return false;

  const p = prevTok.value;
  const n = nextTok.value;

  // After these tokens, newlines can terminate statements
  const terminators = new Set([
    ")", "]", "++", "--",
  ]);

  if (terminators.has(p)) return true;
  if (prevTok.type === TT.IDENTIFIER || prevTok.type === TT.NUMBER ||
      prevTok.type === TT.STRING || prevTok.type === TT.TEMPLATE ||
      prevTok.type === TT.REGEX) {
    // Check if next token could start a new statement
    const starters = new Set([
      "var","let","const","function","class","if","for","while",
      "do","switch","throw","try","return","import","export",
      "break","continue","debugger",
    ]);
    if (nextTok.type === TT.KEYWORD && starters.has(n)) return true;

    // Unambiguous next token that continues current expression
    const continuers = new Set([
      "=","+=","-=","*=","/=","%=","**=","&&=","||=","??=",
      "==","!=","===","!==","<","<=",">",">=",
      "&&","||","??","?",":",".","?.","[","(",
      "+","-","*","/","%","**","&","|","^","<<",">>",">>>",
      "=>","in","instanceof","of",
    ]);
    if (continuers.has(n)) return false;
  }

  // return, throw, break, continue — always need ; after expression
  if (prevTok.type === TT.KEYWORD &&
      ["return","throw"].includes(p) &&
      nextTok.type !== TT.PUNCTUATION) {
    return false; // next token is on same line logically
  }

  return false;
}

// ── Core minifier ─────────────────────────────────────────────
function minifyJs(src, options = {}) {
  const {
    removeComments       = true,
    preserveLicenses     = true,
    mangle               = false,   // identifier shortening (basic)
    dropConsole          = false,
    dropDebugger         = true,
    collapseStrings      = false,   // merge adjacent string literals
    removeDeadCode       = false,   // remove code after return/throw
    level                = "standard",
  } = options;

  if (!src || !src.trim()) {
    return { success: false, output: "", error: "Input is empty." };
  }

  try {
    const tokens = tokenizeJs(src.trim());
    const meaningful = [];

    // ── Pass 1: filter tokens ─────────────────────────────────
    for (const tok of tokens) {
      // Skip whitespace and newlines
      if (tok.type === TT.WHITESPACE || tok.type === TT.NEWLINE) continue;

      // Handle comments
      if (tok.type === TT.COMMENT_LINE) {
        if (removeComments) continue;
        meaningful.push(tok);
        continue;
      }

      if (tok.type === TT.COMMENT_BLOCK) {
        if (removeComments) {
          if (preserveLicenses && tok.isLicense) {
            meaningful.push(tok);
          }
          continue;
        }
        meaningful.push(tok);
        continue;
      }

      // Drop debugger statements
      if (dropDebugger && tok.type === TT.KEYWORD && tok.value === "debugger") {
        continue;
      }

      meaningful.push(tok);
    }

    // ── Pass 2: Drop console.* calls ──────────────────────────
    let filtered = meaningful;
    if (dropConsole) {
      filtered = dropConsoleCalls(meaningful);
    }

    // ── Pass 3: Build output ───────────────────────────────────
    let out  = "";
    let prev = null;

    for (let i = 0; i < filtered.length; i++) {
      const tok  = filtered[i];
      const next = filtered[i + 1];
      const val  = tok.value;

      // License comments get their own line
      if (tok.type === TT.COMMENT_BLOCK && tok.isLicense) {
        if (out && !out.endsWith("\n")) out += "\n";
        out += val + "\n";
        prev = tok;
        continue;
      }

      // Line comments
      if (tok.type === TT.COMMENT_LINE) {
        if (out && !out.endsWith("\n")) out += "\n";
        out += val + "\n";
        prev = tok;
        continue;
      }

      // Determine if a space is needed between prev and current
      if (prev) {
        const needsSpace = requiresSpace(prev, tok);
        if (needsSpace) out += " ";
      }

      out += val;
      prev = tok;
    }

    // ── Post-process ──────────────────────────────────────────
    out = out
      .replace(/\n{2,}/g, "\n")  // max 1 consecutive newline
      .trim();

    const saved    = src.length - out.length;
    const savedPct = Math.round((saved / src.length) * 100);

    // Analyze original
    const fnCount      = (src.match(/\bfunction\b/g) || []).length +
                         (src.match(/=>/g) || []).length;
    const classCount   = (src.match(/\bclass\b/g) || []).length;
    const importCount  = (src.match(/\bimport\b/g) || []).length;
    const consoleCount = (src.match(/\bconsole\./g) || []).length;
    const debuggerCount= (src.match(/\bdebugger\b/g) || []).length;
    const commentLines = (src.match(/\/\/[^\n]*/g) || []).length;
    const commentBlocks= (src.match(/\/\*[\s\S]*?\*\//g) || []).length;

    return {
      success: true,
      output:  out,
      stats: {
        inputLength:    src.length,
        outputLength:   out.length,
        saved,
        savedPct,
        inputLines:     src.split("\n").length,
        gzipEstimate:   Math.round(out.length * 0.35),
        functions:      fnCount,
        classes:        classCount,
        imports:        importCount,
        consoleRemoved: dropConsole ? consoleCount : 0,
        debuggerRemoved:dropDebugger ? debuggerCount : 0,
        commentsRemoved:removeComments ? commentLines + commentBlocks : 0,
      },
    };
  } catch (e) {
    return { success: false, output: "", error: `Minification error: ${e.message}` };
  }
}

// ── Requires space between two tokens? ────────────────────────
function requiresSpace(prev, tok) {
  if (!prev) return false;

  const pv = prev.value;
  const tv = tok.value;
  const pt = prev.type;
  const tt = tok.type;

  // Keywords always need spaces around them
  if (pt === TT.KEYWORD && (tt === TT.KEYWORD || tt === TT.IDENTIFIER || tt === TT.NUMBER)) return true;
  if (tt === TT.KEYWORD && (pt === TT.KEYWORD || pt === TT.IDENTIFIER || pt === TT.NUMBER)) return true;

  // Identifiers
  if (pt === TT.IDENTIFIER && (tt === TT.IDENTIFIER || tt === TT.NUMBER || tt === TT.KEYWORD)) return true;
  if (tt === TT.IDENTIFIER && (pt === TT.NUMBER)) return true;

  // Numbers
  if (pt === TT.NUMBER && tt === TT.NUMBER) return true;
  if (pt === TT.NUMBER && tt === TT.IDENTIFIER) return true;
  if (pt === TT.NUMBER && tt === TT.KEYWORD) return true;

  // String / template / regex continuations
  if (pt === TT.STRING && tt === TT.KEYWORD) return true;
  if (pt === TT.STRING && tt === TT.IDENTIFIER) return true;
  if (pt === TT.TEMPLATE && tt === TT.KEYWORD) return true;
  if (pt === TT.TEMPLATE && tt === TT.IDENTIFIER) return true;
  if (pt === TT.REGEX && tt === TT.KEYWORD) return true;
  if (pt === TT.REGEX && tt === TT.IDENTIFIER) return true;

  // Operators that look like words
  if (pt === TT.KEYWORD && tt === TT.STRING) return true;

  // return/throw/typeof/delete/void/new/in/of/instanceof need space before expression
  const needSpaceAfter = new Set(["return","throw","typeof","delete","void","new","case","in","of","instanceof","yield","await","from","export","import","extends","static"]);
  if (pt === TT.KEYWORD && needSpaceAfter.has(pv)) return true;

  // Avoid -- and ++ merging with adjacent operators
  if ((pv === "--" || pv === "++") && (tv === "-" || tv === "+")) return true;
  if ((tv === "--" || tv === "++") && (pv === "-" || pv === "+")) return true;

  // Arrow function
  if (pv === "=>" && tt !== TT.PUNCTUATION) return true;

  // Spread / rest
  if (pv === "..." && (tt === TT.IDENTIFIER || tt === TT.KEYWORD)) return false;

  // Optional chaining
  if (pv === "?." || tv === "?.") return false;

  // No space needed between punctuation and most things
  if (pt === TT.PUNCTUATION && pv !== "]" && pv !== ")" && pv !== "}") return false;
  if (tt === TT.PUNCTUATION) return false;

  return false;
}

// ── Drop console.* calls ──────────────────────────────────────
function dropConsoleCalls(tokens) {
  const result = [];
  let i = 0;

  while (i < tokens.length) {
    // Detect: console . METHOD ( ... )
    if (
      tokens[i]?.type === TT.IDENTIFIER &&
      tokens[i]?.value === "console" &&
      tokens[i + 1]?.type === TT.PUNCTUATION &&
      tokens[i + 1]?.value === "." &&
      tokens[i + 2]?.type === TT.IDENTIFIER &&
      ["log","warn","error","info","debug","trace","table",
       "group","groupEnd","groupCollapsed","time","timeEnd",
       "assert","count","countReset","dir","dirxml"].includes(tokens[i + 2]?.value)
    ) {
      // Check if preceded by assignment (don't remove: const x = console.log)
      const prev = result[result.length - 1];
      if (prev && (prev.value === "=" || prev.value === ":" || prev.value === "return")) {
        result.push(tokens[i++]); continue;
      }

      // Skip: console.METHOD(...)
      i += 3; // skip console, ., method

      // Skip opening paren
      if (tokens[i]?.value === "(") {
        i++;
        let depth = 1;
        while (i < tokens.length && depth > 0) {
          if (tokens[i].value === "(") depth++;
          if (tokens[i].value === ")") depth--;
          i++;
        }
      }

      // Skip trailing semicolon if present
      if (tokens[i]?.value === ";") i++;
      continue;
    }

    result.push(tokens[i++]);
  }

  return result;
}

// ── JS Analyzer ───────────────────────────────────────────────
function analyzeJs(src) {
  const functions    = (src.match(/\bfunction\b/g) || []).length;
  const arrowFns     = (src.match(/=>/g) || []).length;
  const classes      = (src.match(/\bclass\b/g) || []).length;
  const imports      = (src.match(/\bimport\b/g) || []).length;
  const exports      = (src.match(/\bexport\b/g) || []).length;
  const asyncFns     = (src.match(/\basync\b/g) || []).length;
  const consts       = (src.match(/\bconst\b/g) || []).length;
  const lets         = (src.match(/\blet\b/g) || []).length;
  const vars         = (src.match(/\bvar\b/g) || []).length;
  const consoleLog   = (src.match(/\bconsole\.\w+\b/g) || []).length;
  const debuggers    = (src.match(/\bdebugger\b/g) || []).length;
  const lineComments = (src.match(/\/\/.*/g) || []).length;
  const blockComments= (src.match(/\/\*[\s\S]*?\*\//g) || []).length;
  const todos        = (src.match(/\/\/\s*TODO/gi) || []).length;
  const licenses     = (src.match(/\/\*!/g) || []).length;
  const templateLits = (src.match(/`[^`]*`/g) || []).length;
  const promises     = (src.match(/\bnew\s+Promise\b/g) || []).length;
  const tryCatch     = (src.match(/\btry\b/g) || []).length;

  const branches = (src.match(
    /\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcase\b|\bcatch\b/g
  ) || []).length;

  return {
    functions, arrowFns, classes, imports, exports,
    asyncFns, consts, lets, vars,
    consoleLog, debuggers, lineComments, blockComments,
    todos, licenses, templateLits, promises, tryCatch, branches,
    totalFunctions: functions + arrowFns,
    totalComments:  lineComments + blockComments,
  };
}

// ── Compute size comparison breakdown ─────────────────────────
function buildDiff(original, minified, stats) {
  // Comments saved
  const commentContent = [
    ...(original.match(/\/\/[^\n]*/g) || []),
    ...(original.match(/\/\*[\s\S]*?\*\//g) || []),
  ].join("");
  const commentChars = commentContent.length;

  // Whitespace saved
  const wsOrig = (original.match(/\s/g) || []).length;
  const wsMin  = (minified.match(/\s/g) || []).length;
  const wsRemoved = Math.max(0, wsOrig - wsMin);

  // Other (operators collapsed, etc.)
  const other = Math.max(0, original.length - minified.length - commentChars - wsRemoved);

  return { comments: commentChars, whitespace: wsRemoved, other };
}

// ── Beautify minified JS (for diffing) ───────────────────────
function beautifyMinified(src) {
  if (!src) return "";
  try {
    let out   = "";
    let depth = 0;
    const indent = "  ";
    let i = 0;

    while (i < src.length) {
      const ch = src[i];

      if (ch === "{") {
        out += " {\n" + indent.repeat(depth + 1);
        depth++;
        i++;
      } else if (ch === "}") {
        depth = Math.max(0, depth - 1);
        out = out.trimEnd();
        out += "\n" + indent.repeat(depth) + "}";
        const next = src[i + 1];
        if (next && next !== ")" && next !== "," && next !== ";") out += "\n" + indent.repeat(depth);
        else if (next === ";") { out += ";\n" + indent.repeat(depth); i += 2; continue; }
        i++;
      } else if (ch === ";") {
        out += ";\n" + indent.repeat(depth);
        i++;
      } else {
        out += ch; i++;
      }
    }

    return out.trim();
  } catch {
    return src;
  }
}

// ============================================================
// CONSTANTS
// ============================================================

const PRESETS = {
  safe: {
    label:           "Safe",
    desc:            "Remove comments and whitespace only — no code changes",
    icon:            ShieldCheck,
    color:           "text-green-700 bg-green-50 border-green-200",
    removeComments:  true,
    preserveLicenses:true,
    dropConsole:     false,
    dropDebugger:    false,
    level:           "safe",
  },
  standard: {
    label:           "Standard",
    desc:            "Recommended — strips comments, whitespace, debugger statements",
    icon:            Sparkles,
    color:           "text-blue-700 bg-blue-50 border-blue-200",
    removeComments:  true,
    preserveLicenses:true,
    dropConsole:     false,
    dropDebugger:    true,
    level:           "standard",
  },
  aggressive: {
    label:           "Aggressive",
    desc:            "Maximum — removes console.* calls + debugger + all comments",
    icon:            Rocket,
    color:           "text-purple-700 bg-purple-50 border-purple-200",
    removeComments:  true,
    preserveLicenses:false,
    dropConsole:     true,
    dropDebugger:    true,
    level:           "aggressive",
  },
};


// ── Source map note (stub) ────────────────────────────────────
function generateSourceMapStub(originalSrc, minifiedSrc) {
  return JSON.stringify({
    version:  3,
    sources:  ["original.js"],
    names:    [],
    mappings: "",
    file:     "minified.js",
    _note:    "Full source maps require a build tool (webpack, esbuild, rollup)",
  }, null, 2);
}

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
      <p className="text-xs font-mono text-red-700 leading-relaxed break-all">{message}</p>
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
function SizeCard({ stats, input, output }) {
  if (!stats || !output) return null;

  const bytesOrig = new TextEncoder().encode(input).length;
  const bytesMin  = new TextEncoder().encode(output).length;
  const miniPct   = Math.round((stats.outputLength / stats.inputLength) * 100);
  const diff      = buildDiff(input, output, stats);

  function fmt(b) {
    if (b < 1024) return `${b} B`;
    return `${(b / 1024).toFixed(1)} KB`;
  }

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

      {/* Bars */}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { label: "Comments removed",    value: `${diff.comments.toLocaleString()} chars`,   color: "text-orange-600 bg-orange-50 border-orange-200"   },
            { label: "Whitespace removed",  value: `${diff.whitespace.toLocaleString()} chars`, color: "text-blue-600 bg-blue-50 border-blue-200"         },
            { label: "Other optimizations", value: `${diff.other.toLocaleString()} chars`,       color: "text-purple-600 bg-purple-50 border-purple-200"   },
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
          { label: "Saved chars",    value: stats.saved.toLocaleString()         },
          { label: "Saved bytes",    value: fmt(bytesOrig - bytesMin)             },
          { label: "Input lines",    value: stats.inputLines.toLocaleString()     },
          { label: "Functions",      value: stats.functions?.toLocaleString()      },
        ].map(({ label, value }) => (
          <div key={label} className="px-5 py-3 border-r border-gray-100 last:border-r-0">
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className="text-sm font-bold font-mono text-gray-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* What was removed */}
      {(stats.consoleRemoved > 0 || stats.debuggerRemoved > 0 || stats.commentsRemoved > 0) && (
        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Code-level removals
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.commentsRemoved > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-50 border border-orange-200 text-orange-700 rounded-lg">
                💬 {stats.commentsRemoved} comment{stats.commentsRemoved !== 1 ? "s" : ""} removed
              </span>
            )}
            {stats.debuggerRemoved > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 border border-red-200 text-red-700 rounded-lg">
                🔴 {stats.debuggerRemoved} debugger statement{stats.debuggerRemoved !== 1 ? "s" : ""} removed
              </span>
            )}
            {stats.consoleRemoved > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
                🖥 {stats.consoleRemoved} console.* call{stats.consoleRemoved !== 1 ? "s" : ""} removed
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analysis panel ────────────────────────────────────────────
function AnalysisPanel({ src }) {
  if (!src.trim()) return null;
  const a = analyzeJs(src);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Code Analysis
        </span>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {[
          { label: "Functions",      value: a.functions + a.arrowFns, color: "text-blue-600",   icon: "ƒ"  },
          { label: "Arrow fns",      value: a.arrowFns,               color: "text-indigo-600", icon: "→"  },
          { label: "Classes",        value: a.classes,                color: "text-purple-600", icon: "C"  },
          { label: "Imports",        value: a.imports,                color: "text-green-600",  icon: "↓"  },
          { label: "Exports",        value: a.exports,                color: "text-teal-600",   icon: "↑"  },
          { label: "Async fns",      value: a.asyncFns,               color: "text-orange-600", icon: "⏳" },
          { label: "console.*",      value: a.consoleLog,             color: "text-yellow-600", icon: "🖥" },
          { label: "debugger",       value: a.debuggers,              color: "text-red-600",    icon: "⛔" },
          { label: "try/catch",      value: a.tryCatch,               color: "text-amber-600",  icon: "🛡" },
          { label: "Comments",       value: a.totalComments,          color: "text-gray-500",   icon: "//" },
          { label: "License (/*!)", value: a.licenses,               color: "text-emerald-600",icon: "⚖" },
          { label: "TODOs",          value: a.todos,                  color: "text-rose-600",   icon: "!"  },
        ].map(({ label, value, color, icon }) => (
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

      {/* Code quality hints */}
      {(a.vars > 0 || a.consoleLog > 0 || a.debuggers > 0 || a.todos > 0) && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-gray-100 pt-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Production readiness hints
          </p>
          {a.vars > 0 && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg">
              <svg width="12" height="12" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {a.vars} <code className="font-mono font-bold mx-0.5">var</code> declaration{a.vars !== 1 ? "s" : ""} — prefer <code className="font-mono font-bold mx-0.5">const</code> / <code className="font-mono font-bold mx-0.5">let</code>
            </div>
          )}
          {a.consoleLog > 0 && (
            <div className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-lg">
              <svg width="12" height="12" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {a.consoleLog} <code className="font-mono font-bold mx-0.5">console.*</code> call{a.consoleLog !== 1 ? "s" : ""} — remove or enable "Drop console" preset
            </div>
          )}
          {a.debuggers > 0 && (
            <div className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg">
              <svg width="12" height="12" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              {a.debuggers} <code className="font-mono font-bold mx-0.5">debugger</code> statement{a.debuggers !== 1 ? "s" : ""} — will pause execution in browsers!
            </div>
          )}
          {a.todos > 0 && (
            <div className="flex items-center gap-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg">
              <svg width="12" height="12" className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {a.todos} TODO comment{a.todos !== 1 ? "s" : ""} — track in your issue tracker
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Options panel ─────────────────────────────────────────────
function OptionsPanel({ opts, onChange }) {
  const options = [
    {
      key:  "removeComments",
      label:"Remove comments",
      desc: "Strip // and /* */ comments (preserves /*! licenses when enabled below)",
      risk: "safe",
    },
    {
      key:  "preserveLicenses",
      label:"Preserve licenses (/*!)",
      desc: "Always keep /*! important */ license and attribution comments",
      risk: "safe",
    },
    {
      key:  "dropDebugger",
      label:"Remove debugger statements",
      desc: "Strip all `debugger;` statements — they pause execution in browsers",
      risk: "safe",
    },
    {
      key:  "dropConsole",
      label:"Remove console.* calls",
      desc: "Strip console.log/warn/error/debug/trace and 10 other console methods",
      risk: "caution",
    },
  ];

  const riskColors = {
    safe:    "text-green-600",
    caution: "text-amber-600",
    risky:   "text-red-600",
  };

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

// ── Diff view ─────────────────────────────────────────────────
function DiffView({ original, minified }) {
  if (!original || !minified) return null;

  const origLines = original.split("\n");
  const minLines  = minified.split("\n");

  // Show first 20 lines of minified alongside original chars
  const preview = minLines.slice(0, 3).map((line) => {
    if (line.length > 120) return line.slice(0, 120) + "…";
    return line;
  });

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Output Preview
        </span>
      </div>
      <div className="px-4 py-3 bg-gray-900 overflow-x-auto">
        {preview.map((line, i) => (
          <div key={i} className="flex items-start gap-3 py-0.5">
            <span className="text-xs text-gray-600 font-mono w-6 flex-shrink-0 select-none">
              {i + 1}
            </span>
            <code className="text-xs font-mono text-green-400 break-all whitespace-pre-wrap">
              {line || " "}
            </code>
          </div>
        ))}
        {minLines.length > 3 && (
          <p className="text-xs text-gray-500 mt-2 font-mono pl-9">
            ... {(minLines.length - 3).toLocaleString()} more line{minLines.length - 3 !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Source map panel ──────────────────────────────────────────
function SourceMapPanel({ input, output }) {
  const [showMap, setShowMap] = useState(false);

  const sourceMap = generateSourceMapStub(input, output);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Source Map
          </span>
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
            Stub only
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMap((v) => !v)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            {showMap ? "Hide" : "Show"} source map
          </button>
          {showMap && <CopyButton text={sourceMap} label="Copy" />}
        </div>
      </div>

      {showMap ? (
        <div className="px-4 py-3 bg-gray-900 overflow-x-auto max-h-[200px]">
          <pre className="text-xs font-mono text-green-400 whitespace-pre">
            {sourceMap}
          </pre>
        </div>
      ) : (
        <div className="px-4 py-3 bg-gray-50">
          <p className="text-xs text-gray-400 leading-relaxed">
            Full source maps with line/column mappings require a build tool like{" "}
            <code className="font-mono bg-gray-100 px-1 rounded">esbuild</code>,{" "}
            <code className="font-mono bg-gray-100 px-1 rounded">webpack</code>, or{" "}
            <code className="font-mono bg-gray-100 px-1 rounded">terser</code>.
            This stub shows the structure — enable source maps in your bundler config.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JsMinifier() {
  const [activeTab,    setActiveTab]    = useState("minify");
  const [input,        setInput]        = useState("");
  const [output,       setOutput]       = useState("");
  const [error,        setError]        = useState(null);
  const [stats,        setStats]        = useState(null);
  const [preset,       setPreset]       = useState("standard");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showDiff,     setShowDiff]     = useState(false);
  const [showSourceMap,setShowSourceMap]= useState(false);
  const [showLines,    setShowLines]    = useState(false);
  const [autoMinify,   setAutoMinify]   = useState(false);
  const [activeSample, setActiveSample] = useState(null);
  const [opts, setOpts] = useState({ ...PRESETS.standard });

  const TABS = [
  { value: "minify",  label: "Minify",  icon: Minimize2 },
  { value: "analyze", label: "Analyze", icon: Search },
];

  function handlePresetChange(key) {
    setPreset(key);
    setOpts({ ...PRESETS[key] });
    if (input.trim() && output) {
      setOutput(""); setStats(null);
    }
  }

  function handleOptChange(key, value) {
    setOpts((prev) => ({ ...prev, [key]: value }));
    setPreset("custom");
  }

  // ── Process ──────────────────────────────────────────────────
  const handleMinify = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Please enter JavaScript to minify.");
      setOutput(""); setStats(null);
      return;
    }
    const result = minifyJs(trimmed, opts);
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
    const t = setTimeout(handleMinify, 500);
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
        <Icon size={16} />
        <span>{tab.label}</span>
      </button>
    );
  })}
</div>

      {/* ── Analyze tab ──────────────────────────────────────── */}
      {activeTab === "analyze" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <svg width="15" height="15" className="flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">
              Analyzes JavaScript code for functions, classes, imports, console calls, debugger statements,
              comment types, and production-readiness hints — without modifying the code.
            </p>
          </div>
          <div className="flex flex-col">
            <PanelHeader
              label="JavaScript to analyze"
              meta={inputMeta}
              actions={
                input && (
                  <button
                    onClick={() => setInput("")}
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
              placeholder="Paste JavaScript to analyze..."
              spellCheck={false}
              autoCorrect="off"
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[300px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
            />
          </div>
          {input.trim() && <AnalysisPanel src={input} />}
        </div>
      )}

      {/* ── Minify tab ────────────────────────────────────────── */}
      {activeTab === "minify" && (
        <>
          {/* Preset selector */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Minification preset
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
              Minify JS
            </button>

            <Toggle
              checked={autoMinify}
              onChange={setAutoMinify}
              label="Auto minify"
              description="Minify automatically as you type (500ms delay)"
            />
            <Toggle
              checked={showLines}
              onChange={setShowLines}
              label="Line numbers"
              description="Show line numbers on input"
            />
            <Toggle
              checked={showAnalysis}
              onChange={setShowAnalysis}
              label="Analysis"
              description="Show code analysis panel"
            />
            <Toggle
              checked={showDiff}
              onChange={setShowDiff}
              label="Preview"
              description="Show dark-mode preview of minified output"
            />
            <Toggle
              checked={showSourceMap}
              onChange={setShowSourceMap}
              label="Source map"
              description="Show source map information"
            />

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
              {showAdvanced ? "Hide options" : "Fine-tune"}
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
                Individual options
              </p>
              <OptionsPanel opts={opts} onChange={handleOptChange} />

              {/* Console drop notice */}
              {opts.dropConsole && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl mt-2">
                  <svg width="13" height="13" className="flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-amber-700">
                    <strong>console.* removal:</strong> Drops console.log/warn/error/debug/trace/table and 7 other
                    methods. Skips calls used in assignments like{" "}
                    <code className="font-mono bg-amber-100 px-1 rounded">const fn = console.log</code>.
                    Test thoroughly — some libraries use console for user-facing output.
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
                label="JavaScript Input"
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
              <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden min-h-[420px]">
                {showLines && input && <LineNumbers text={input} />}
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
                  placeholder={`Paste JavaScript to minify...\n\nSupports:\n• ES2022+ (const, let, arrow functions)\n• Classes with private fields (#field)\n• Async/await, destructuring, spread\n• Template literals and tagged templates\n• Import/export (ESM)\n• Regex literals\n• JSDoc comments\n• /*! License comments (preserved)`}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white outline-none resize-none min-h-[420px] focus:outline-none placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
                />
              </div>
            </div>

            {/* Output */}
            <div className="flex flex-col">
              <PanelHeader
                label="Minified JS"
                meta={outputMeta}
                actions={
                  <>
                    {output && <CopyButton text={output} />}
                    {output && (
                      <button
                        onClick={() => downloadText(output, "minified.js", "application/javascript")}
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
              <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[420px] relative">
                {output ? (
                  <textarea
                    value={output}
                    readOnly
                    spellCheck={false}
                    className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[420px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <p className="text-xs text-gray-300">Minified JS appears here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          <ErrorBanner message={error} />

          {/* Size card */}
          {stats && output && (
            <SizeCard stats={stats} input={input} output={output} />
          )}

          {/* Code analysis */}
          {showAnalysis && input.trim() && (
            <AnalysisPanel src={input} />
          )}

          {/* Output preview */}
          {showDiff && output && (
            <DiffView original={input} minified={output} />
          )}

          {/* Source map */}
          {showSourceMap && output && (
            <SourceMapPanel input={input} output={output} />
          )}

          {/* License comment notice */}
          {opts.removeComments && opts.preserveLicenses && output?.includes("/*!") && (
            <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <svg width="15" height="15" className="flex-shrink-0 mt-0.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-xs text-emerald-700">
                <strong>License comments preserved:</strong>{" "}
                <code className="font-mono bg-emerald-100 px-1 rounded">/*!...*/</code> banner comments
                are always kept — required for MIT, Apache, and other open-source license compliance.
              </p>
            </div>
          )}

          
        </>
      )}
    </div>
  );
}