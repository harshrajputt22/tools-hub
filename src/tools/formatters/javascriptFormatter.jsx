"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Braces,
  Minimize2,
  Zap,
  Copy,
  Check,
  Download,
  Trash2,
  AlertCircle,
  ArrowUp,
  Info,
  TriangleAlert,
} from "lucide-react";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// JAVASCRIPT FORMATTER ENGINE
// ============================================================

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

function tokenizeJs(src) {
  const tokens = [];
  let i = 0;
  let lastMeaningfulToken = null;

  function peek(offset = 0) { return src[i + offset]; }

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
    while (i < src.length) { if (src[i] === "*" && src[i + 1] === "/") { s += "*/"; i += 2; break; } s += src[i++]; }
    return s;
  }

  function readNumber() {
    let s = "";
    if (src[i] === "0" && (src[i + 1] === "x" || src[i + 1] === "X")) {
      s = src[i] + src[i + 1]; i += 2;
      while (i < src.length && /[0-9a-fA-F_]/.test(src[i])) s += src[i++];
      return s;
    }
    if (src[i] === "0" && (src[i + 1] === "b" || src[i + 1] === "B")) {
      s = src[i] + src[i + 1]; i += 2;
      while (i < src.length && /[01_]/.test(src[i])) s += src[i++];
      return s;
    }
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
    if (i < src.length && src[i] === "n") s += src[i++];
    return s;
  }

  function isRegexStart() {
    if (!lastMeaningfulToken) return true;
    const t = lastMeaningfulToken;
    if (t.type === TT.PUNCTUATION) return ["(","[","{","}",";",",","!","&","|","?",":","=","+","-","*","%","~","^","<",">"].includes(t.value);
    if (t.type === TT.KEYWORD) return ["return","typeof","instanceof","in","of","delete","throw","new","void","case"].includes(t.value);
    return false;
  }

  function readRegex() {
    let s = "/"; i++;
    let inClass = false;
    while (i < src.length) {
      const ch = src[i];
      if (ch === "\\" && i + 1 < src.length) { s += ch + src[i + 1]; i += 2; continue; }
      if (ch === "[") { inClass = true; s += ch; i++; continue; }
      if (ch === "]") { inClass = false; s += ch; i++; continue; }
      if (ch === "/" && !inClass) { s += ch; i++; break; }
      s += ch; i++;
    }
    while (i < src.length && /[gimsuy]/.test(src[i])) s += src[i++];
    return s;
  }

  while (i < src.length) {
    const ch = src[i];
    if (ch === "\n" || ch === "\r") { tokens.push({ type: TT.NEWLINE, value: ch }); i++; continue; }
    if (/[ \t]/.test(ch)) { let ws = ""; while (i < src.length && /[ \t]/.test(src[i])) ws += src[i++]; tokens.push({ type: TT.WHITESPACE, value: ws }); continue; }
    if (ch === "/" && peek(1) === "/") { const val = readLineComment(); tokens.push({ type: TT.COMMENT_LINE, value: val }); continue; }
    if (ch === "/" && peek(1) === "*") { const val = readBlockComment(); tokens.push({ type: TT.COMMENT_BLOCK, value: val }); continue; }
    if (ch === "/" && isRegexStart()) { const val = readRegex(); const tok = { type: TT.REGEX, value: val }; tokens.push(tok); lastMeaningfulToken = tok; continue; }
    if (ch === '"' || ch === "'") { const val = readString(ch); const tok = { type: TT.STRING, value: val }; tokens.push(tok); lastMeaningfulToken = tok; continue; }
    if (ch === "`") { const val = readTemplate(); const tok = { type: TT.TEMPLATE, value: val }; tokens.push(tok); lastMeaningfulToken = tok; continue; }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(peek(1)))) { const val = readNumber(); const tok = { type: TT.NUMBER, value: val }; tokens.push(tok); lastMeaningfulToken = tok; continue; }
    if (/[a-zA-Z_$]/.test(ch)) {
      let id = "";
      while (i < src.length && /[a-zA-Z0-9_$]/.test(src[i])) id += src[i++];
      const type = JS_KEYWORDS.has(id) ? TT.KEYWORD : TT.IDENTIFIER;
      const tok  = { type, value: id };
      tokens.push(tok); lastMeaningfulToken = tok; continue;
    }
    const MULTI_OPS = ["===","!==",">>>","**=","&&=","||=","??=","<<=",">>=","==","!=","<=",">=","=>","**","++","--","&&","||","??","+=","-=","*=","/=","%=","&=","|=","^=","<<",">>","?."];
    let matched = false;
    for (const op of MULTI_OPS) {
      if (src.slice(i, i + op.length) === op) {
        const tok = { type: TT.OPERATOR, value: op };
        tokens.push(tok); lastMeaningfulToken = tok; i += op.length; matched = true; break;
      }
    }
    if (matched) continue;
    const PUNCTUATION = new Set("(){}[];,.:?~");
    const OPERATORS   = new Set("=<>!&|^+-%*/");
    if (PUNCTUATION.has(ch)) { const tok = { type: TT.PUNCTUATION, value: ch }; tokens.push(tok); lastMeaningfulToken = tok; i++; }
    else if (OPERATORS.has(ch)) { const tok = { type: TT.OPERATOR, value: ch }; tokens.push(tok); lastMeaningfulToken = tok; i++; }
    else { const tok = { type: TT.PUNCTUATION, value: ch }; tokens.push(tok); lastMeaningfulToken = tok; i++; }
  }

  return tokens;
}

function formatJs(src, options = {}) {
  const { indentSize = 2, useTabs = false, semicolons = true, singleQuotes = false, trailingCommas = false, removeComments = false } = options;
  if (!src || !src.trim()) return { success: false, output: "", error: "Input is empty." };
  try {
    const tokens = tokenizeJs(src.trim());
    const output = renderJs(tokens, { indent: useTabs ? "\t" : " ".repeat(indentSize), semicolons, singleQuotes, trailingCommas, removeComments });
    return {
      success: true, output: output.trimEnd(),
      stats: { inputLength: src.length, outputLength: output.length, inputLines: src.split("\n").length, outputLines: output.split("\n").length, tokenCount: tokens.filter((t) => t.type !== TT.WHITESPACE && t.type !== TT.NEWLINE).length },
    };
  } catch (e) {
    return { success: false, output: "", error: `Format error: ${e.message}` };
  }
}

function renderJs(tokens, opts) {
  const { indent, semicolons, singleQuotes, trailingCommas, removeComments } = opts;
  const meaningful = tokens.filter((t) => t.type !== TT.WHITESPACE && t.type !== TT.NEWLINE);
  let out   = "";
  let depth = 0;
  let i     = 0;

  function pad(d = depth) { return indent.repeat(Math.max(0, d)); }
  function peek(offset = 1) { return meaningful[i + offset]; }
  function prev(offset = 1) { return meaningful[i - offset]; }

  function processString(val) {
    if (!singleQuotes) return val;
    if (val.startsWith('"') && !val.slice(1, -1).includes("'")) return "'" + val.slice(1, -1).replace(/\\"/g, '"') + "'";
    return val;
  }

  function isBlockBrace(idx) {
    const before = meaningful[idx - 1];
    if (!before) return true;
    if (before.type === TT.PUNCTUATION && before.value === ")") return true;
    if (before.type === TT.KEYWORD && ["else","try","finally","do"].includes(before.value)) return true;
    if (before.type === TT.IDENTIFIER && meaningful[idx - 2]?.type === TT.KEYWORD) return true;
    if (before.type === TT.OPERATOR && before.value === "=>") return true;
    return before.type === TT.KEYWORD;
  }

  while (i < meaningful.length) {
    const tok = meaningful[i];
    const next = peek();
    const pr   = prev();

    switch (tok.type) {
      case TT.COMMENT_LINE: {
        if (removeComments) { i++; break; }
        if (pr && pr.type !== TT.NEWLINE) out += ` ${tok.value}\n`;
        else out += `${pad()}${tok.value}\n`;
        i++; break;
      }
      case TT.COMMENT_BLOCK: {
        if (removeComments) { i++; break; }
        const lines = tok.value.split("\n");
        if (lines.length === 1) { out += out.endsWith("\n") ? `${pad()}${tok.value}\n` : ` ${tok.value} `; }
        else {
          out += `${pad()}${lines[0]}\n`;
          for (let li = 1; li < lines.length - 1; li++) out += `${pad()} ${lines[li].trim()}\n`;
          out += `${pad()} ${lines[lines.length - 1].trim()}\n`;
        }
        i++; break;
      }
      case TT.KEYWORD: {
        const kw = tok.value;
        if (out.length > 0 && !out.endsWith("\n") && !out.endsWith("(") && !out.endsWith(",") && !out.endsWith("=") && !out.endsWith(":") && !out.endsWith("!") && !out.endsWith("&") && !out.endsWith("|") && !out.endsWith("?")) {
          if (pr && (pr.type === TT.IDENTIFIER || pr.type === TT.KEYWORD || pr.type === TT.PUNCTUATION)) { if (!out.endsWith(" ")) out += " "; }
        }
        if (out.endsWith("\n") || out === "") out += pad();
        out += kw;
        const spacedKeywords = new Set(["return","typeof","instanceof","delete","void","throw","new","in","of","case","from","as","await","yield","async","static","class","function","import","export","extends","let","const","var","if","else","for","while","do","try","catch","finally","switch"]);
        if (spacedKeywords.has(kw) && next && next.type !== TT.PUNCTUATION) out += " ";
        i++; break;
      }
      case TT.IDENTIFIER: {
        if (out.endsWith("\n") || out === "") out += pad();
        if (pr && (pr.type === TT.KEYWORD || pr.type === TT.IDENTIFIER || pr.type === TT.NUMBER) && !out.endsWith(" ") && !out.endsWith("\n")) out += " ";
        out += tok.value; i++; break;
      }
      case TT.NUMBER: {
        if (out.endsWith("\n") || out === "") out += pad();
        if (pr && (pr.type === TT.IDENTIFIER || pr.type === TT.KEYWORD) && !out.endsWith(" ")) out += " ";
        out += tok.value; i++; break;
      }
      case TT.STRING: {
        if (out.endsWith("\n") || out === "") out += pad();
        if (pr && (pr.type === TT.IDENTIFIER || pr.type === TT.KEYWORD) && !out.endsWith(" ")) out += " ";
        out += processString(tok.value); i++; break;
      }
      case TT.TEMPLATE: { if (out.endsWith("\n") || out === "") out += pad(); out += tok.value; i++; break; }
      case TT.REGEX:    { if (out.endsWith("\n") || out === "") out += pad(); out += tok.value; i++; break; }
      case TT.OPERATOR: {
        const op = tok.value;
        const unary = new Set(["++","--","!"]);
        if (unary.has(op)) {
          if (next && (next.type === TT.IDENTIFIER || next.type === TT.PUNCTUATION)) { if (!out.endsWith(" ") && !out.endsWith("(")) out += " "; out += op; }
          else out += op;
        } else if (op === "=>") { out += " => "; }
        else if (op === "?.") { out += "?."; }
        else { if (!out.endsWith(" ") && !out.endsWith("\n")) out += " "; out += op; if (op !== ".") out += " "; }
        i++; break;
      }
      case TT.PUNCTUATION: {
        const p = tok.value;
        if (p === "{") {
          const isBlock = isBlockBrace(i);
          if (isBlock) { if (!out.endsWith(" ") && !out.endsWith("\n")) out += " "; out += "{\n"; depth++; }
          else {
            const isEmpty = next && next.type === TT.PUNCTUATION && next.value === "}";
            if (isEmpty) { out += "{}"; i++; }
            else { if (!out.endsWith(" ") && !out.endsWith("\n") && !out.endsWith("(") && !out.endsWith("[")) out += " "; out += "{\n"; depth++; }
          }
        } else if (p === "}") {
          depth = Math.max(0, depth - 1);
          out = out.trimEnd(); out += "\n"; out += `${pad()}}`;
          const afterClose = peek();
          if (afterClose && afterClose.type !== TT.PUNCTUATION && depth === 0) out += "\n";
          out += "\n";
        } else if (p === "(") { out += "("; }
        else if (p === ")") { out = out.trimEnd(); out += ")"; }
        else if (p === "[") { out += "["; }
        else if (p === "]") { out = out.trimEnd(); out += "]"; }
        else if (p === ";") { out = out.trimEnd(); out += ";\n"; }
        else if (p === ",") {
          out = out.trimEnd(); out += ",";
          if (depth > 0) out += "\n"; else out += " ";
        } else if (p === ":") { out = out.trimEnd(); out += ": "; }
        else if (p === ".") { out = out.trimEnd(); out += "."; }
        else if (p === "?") { if (!out.endsWith(" ")) out += " "; out += "? "; }
        else if (p === "~") { out += "~"; }
        else { out += p; }
        i++; break;
      }
      default: out += tok.value; i++;
    }
  }

  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

function minifyJs(src) {
  if (!src.trim()) return { success: false, output: "", error: "Input is empty." };
  try {
    const tokens = tokenizeJs(src.trim());
    let out  = "";
    let prev = null;
    for (const tok of tokens) {
      if (tok.type === TT.WHITESPACE || tok.type === TT.NEWLINE) continue;
      if (tok.type === TT.COMMENT_LINE || tok.type === TT.COMMENT_BLOCK) continue;
      const val = tok.value;
      if (prev) {
        const needsSpace =
          (prev.type === TT.KEYWORD && tok.type === TT.KEYWORD) ||
          (prev.type === TT.KEYWORD && tok.type === TT.IDENTIFIER) ||
          (prev.type === TT.KEYWORD && tok.type === TT.NUMBER) ||
          (prev.type === TT.IDENTIFIER && tok.type === TT.KEYWORD) ||
          (prev.type === TT.IDENTIFIER && tok.type === TT.IDENTIFIER) ||
          (prev.type === TT.IDENTIFIER && tok.type === TT.NUMBER) ||
          (prev.type === TT.NUMBER && tok.type === TT.IDENTIFIER) ||
          (prev.type === TT.NUMBER && tok.type === TT.KEYWORD) ||
          (prev.type === TT.KEYWORD && tok.type === TT.STRING) ||
          (prev.type === TT.KEYWORD && tok.type === TT.REGEX) ||
          (prev.type === TT.IDENTIFIER && tok.type === TT.REGEX) ||
          (prev.type === TT.KEYWORD && ["return","throw","typeof","delete","void","new","in","of","instanceof"].includes(prev.value));
        if (needsSpace) out += " ";
      }
      out += val; prev = tok;
    }
    return { success: true, output: out, stats: { inputLength: src.length, outputLength: out.length, saved: src.length - out.length, savedPct: Math.round(((src.length - out.length) / src.length) * 100) } };
  } catch (e) {
    return { success: false, output: "", error: e.message };
  }
}

function analyzeJs(src) {
  const functions    = (src.match(/\bfunction\s*\w*\s*\(/g) || []).length + (src.match(/=>\s*[{(]/g) || []).length + (src.match(/=>\s*\w/g) || []).length;
  const classes      = (src.match(/\bclass\s+\w+/g) || []).length;
  const imports      = (src.match(/\bimport\b/g) || []).length;
  const exports      = (src.match(/\bexport\b/g) || []).length;
  const asyncFns     = (src.match(/\basync\b/g) || []).length;
  const consts       = (src.match(/\bconst\b/g) || []).length;
  const lets         = (src.match(/\blet\b/g) || []).length;
  const vars         = (src.match(/\bvar\b/g) || []).length;
  const lineComments = (src.match(/\/\/.*/g) || []).length;
  const blockComments= (src.match(/\/\*[\s\S]*?\*\//g) || []).length;
  const todos        = (src.match(/\/\/\s*TODO/gi) || []).length + (src.match(/\/\*.*?TODO.*?\*\//gi) || []).length;
  const consoleLog   = (src.match(/\bconsole\.(log|warn|error|info|debug)\b/g) || []).length;
  const branches     = (src.match(/\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcase\b|\bcatch\b|\b\?\s*:/g) || []).length;
  return { functions, classes, imports, exports, asyncFns, consts, lets, vars, lineComments, blockComments: lineComments + blockComments, todos, consoleLog, branches };
}

// ============================================================
// CONSTANTS
// ============================================================

const SAMPLES = {
  modern: `import{useState,useEffect,useCallback}from"react";import{fetchUsers,deleteUser}from"./api/users";const UserManager=({initialPage=1,pageSize=10})=>{const[users,setUsers]=useState([]);const[loading,setLoading]=useState(false);const[error,setError]=useState(null);const[page,setPage]=useState(initialPage);const loadUsers=useCallback(async()=>{setLoading(true);setError(null);try{const data=await fetchUsers({page,pageSize});setUsers(data.users);}catch(err){setError(err.message||"Failed to load users.");}finally{setLoading(false);}},[page,pageSize]);useEffect(()=>{loadUsers();},[loadUsers]);const handleDelete=async(userId)=>{if(!confirm("Delete this user?"))return;try{await deleteUser(userId);setUsers(prev=>prev.filter(u=>u.id!==userId));}catch(err){setError(err.message);}};};export default UserManager;`,
  class:  `class EventEmitter{constructor(){this._events=new Map();this._maxListeners=10;}on(event,listener){if(typeof listener!=="function")throw new TypeError("Listener must be a function");if(!this._events.has(event))this._events.set(event,[]);const listeners=this._events.get(event);if(listeners.length>=this._maxListeners){console.warn("Max listeners exceeded");}listeners.push(listener);return this;}off(event,listener){if(!this._events.has(event))return this;const filtered=this._events.get(event).filter(l=>l!==listener);if(filtered.length===0)this._events.delete(event);else this._events.set(event,filtered);return this;}emit(event,...args){if(!this._events.has(event))return false;const listeners=[...this._events.get(event)];for(const listener of listeners){try{listener(...args);}catch(err){console.error("Listener error:",err);}}return true;}}`,
  async:  `const BASE_URL="https://api.example.com/v1";async function request(endpoint,options={}){const{method="GET",body=null,headers={},timeout=10000,retries=3}=options;const controller=new AbortController();const timeoutId=setTimeout(()=>controller.abort(),timeout);for(let attempt=0;attempt<retries;attempt++){try{const res=await fetch(BASE_URL+endpoint,{method,headers,...(body&&{body:JSON.stringify(body)}),signal:controller.signal,});clearTimeout(timeoutId);if(!res.ok){throw new Error("HTTP "+res.status);}return res.json();}catch(err){if(attempt===retries-1||err.name==="AbortError")throw err;await new Promise(r=>setTimeout(r,Math.pow(2,attempt)*1000));}}};export const api={get:(url,opts)=>request(url,{...opts,method:"GET"}),post:(url,body,opts)=>request(url,{...opts,method:"POST",body}),};`,
  utils:  `function debounce(fn,wait=300,immediate=false){let timer;return function(...args){const callNow=immediate&&!timer;clearTimeout(timer);timer=setTimeout(()=>{timer=null;if(!immediate)fn.apply(this,args);},wait);if(callNow)fn.apply(this,args);};}function throttle(fn,limit=300){let lastCall=0;return function(...args){const now=Date.now();if(now-lastCall>=limit){lastCall=now;return fn.apply(this,args);}};}function memoize(fn,resolver){const cache=new Map();return function(...args){const key=resolver?resolver(...args):JSON.stringify(args);if(cache.has(key))return cache.get(key);const result=fn.apply(this,args);cache.set(key,result);return result;};}`,
};

const INDENT_OPTIONS = [
  { value: 2,     label: "2 spaces" },
  { value: 4,     label: "4 spaces" },
  { value: "tab", label: "Tabs"     },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        title={description}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${checked ? "bg-blue-600" : "bg-gray-300"}`}
      >
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
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
      <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-red-500" />
      <p className="text-xs font-mono text-red-700 leading-relaxed break-all">{message}</p>
    </div>
  );
}

function CopyButton({ text }) {
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
        <><Check size={12} /><span className="text-green-600">Copied!</span></>
      ) : (
        <><Copy size={12} />Copy</>
      )}
    </button>
  );
}

function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {[
        { label: "Input",  value: `${stats.inputLength?.toLocaleString()} chars`  },
        { label: "Output", value: `${stats.outputLength?.toLocaleString()} chars` },
        { label: "Lines",  value: stats.outputLines?.toLocaleString()              },
        { label: "Tokens", value: stats.tokenCount?.toLocaleString()              },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className="font-mono font-semibold text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
}

function SizeComparison({ original, minified }) {
  if (!original || !minified) return null;
  const saved    = original.length - minified.length;
  const savedPct = Math.round((saved / original.length) * 100);
  const miniPct  = Math.round((minified.length / original.length) * 100);
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Size Reduction</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-bold text-green-700">
          <ArrowUp size={11} />{savedPct}% smaller
        </span>
      </div>
      <div className="space-y-2">
        {[
          { label: "Original", size: original.length, pct: 100,     color: "bg-gray-400"  },
          { label: "Minified", size: minified.length, pct: miniPct, color: "bg-green-500" },
        ].map(({ label, size, pct, color }) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{label}</span>
              <span className={`font-mono font-semibold ${label === "Minified" ? "text-green-600" : "text-gray-600"}`}>
                {size.toLocaleString()} chars
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          { label: "Original", value: `${original.length.toLocaleString()} chars`, color: "text-gray-700"  },
          { label: "Minified", value: `${minified.length.toLocaleString()} chars`, color: "text-green-600" },
          { label: "Saved",    value: `${saved.toLocaleString()} chars`,            color: "text-blue-600"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function JsAnalysisPanel({ src }) {
  if (!src.trim()) return null;
  const a = analyzeJs(src);
  const items = [
    { label: "Functions",   value: a.functions,     color: "text-blue-600"   },
    { label: "Classes",     value: a.classes,        color: "text-purple-600" },
    { label: "Imports",     value: a.imports,        color: "text-green-600"  },
    { label: "Exports",     value: a.exports,        color: "text-orange-600" },
    { label: "Async fns",   value: a.asyncFns,       color: "text-indigo-600" },
    { label: "const",       value: a.consts,         color: "text-teal-600"   },
    { label: "let",         value: a.lets,           color: "text-cyan-600"   },
    { label: "var",         value: a.vars,           color: "text-red-500"    },
    { label: "Branches",    value: a.branches,       color: "text-amber-600"  },
    { label: "console.log", value: a.consoleLog,     color: "text-yellow-600" },
    { label: "Comments",    value: a.blockComments,  color: "text-gray-500"   },
    { label: "TODOs",       value: a.todos,          color: "text-rose-600"   },
  ];
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Code Analysis</span>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {items.map(({ label, value, color }) => (
          <div key={label} className="flex flex-col gap-0.5 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
            <span className="text-xs text-gray-400 font-medium">{label}</span>
            <span className={`text-lg font-bold font-mono ${color}`}>{value}</span>
          </div>
        ))}
      </div>
      {(a.vars > 0 || a.consoleLog > 0 || a.todos > 0) && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-gray-100 pt-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Code quality hints</p>
          {a.vars > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              <TriangleAlert size={12} className="flex-shrink-0" />
              {a.vars} <code className="font-mono font-bold">var</code> declaration{a.vars !== 1 ? "s" : ""} — consider using <code className="font-mono font-bold">const</code> or <code className="font-mono font-bold">let</code>
            </div>
          )}
          {a.consoleLog > 0 && (
            <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg">
              <Info size={12} className="flex-shrink-0" />
              {a.consoleLog} <code className="font-mono font-bold">console.log</code> call{a.consoleLog !== 1 ? "s" : ""} — remove before production
            </div>
          )}
          {a.todos > 0 && (
            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
              <AlertCircle size={12} className="flex-shrink-0" />
              {a.todos} TODO comment{a.todos !== 1 ? "s" : ""} — track in issue tracker
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrettierNotice() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
      <Info size={15} className="flex-shrink-0 mt-0.5 text-blue-500" />
      <p className="text-xs text-blue-700 leading-relaxed">
        <strong>Pure JS formatter</strong> — handles ES2022+, async/await, destructuring, template literals and class syntax.
        For production-grade formatting, use <strong>Prettier CLI</strong> locally.
      </p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JsFormatter() {
  const [input,          setInput]          = useState("");
  const [output,         setOutput]         = useState("");
  const [error,          setError]          = useState(null);
  const [stats,          setStats]          = useState(null);
  const [mode,           setMode]           = useState("format");
  const [indentSize,     setIndentSize]     = useState(2);
  const [semicolons,     setSemicolons]     = useState(true);
  const [singleQuotes,   setSingleQuotes]   = useState(false);
  const [trailingCommas, setTrailingCommas] = useState(false);
  const [removeComments, setRemoveComments] = useState(false);
  const [showLines,      setShowLines]      = useState(true);
  const [showAnalysis,   setShowAnalysis]   = useState(false);
  const [autoProcess,    setAutoProcess]    = useState(false);
  const [activeSample,   setActiveSample]   = useState(null);

  const handleProcess = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) { setError("Please enter JavaScript to process."); setOutput(""); setStats(null); return; }
    if (mode === "minify") {
      const result = minifyJs(trimmed);
      if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
      else { setOutput(""); setError(result.error); setStats(null); }
    } else {
      const result = formatJs(trimmed, { indentSize: indentSize === "tab" ? 2 : indentSize, useTabs: indentSize === "tab", semicolons, singleQuotes, trailingCommas, removeComments });
      if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
      else { setOutput(""); setError(result.error); setStats(null); }
    }
  }, [input, mode, indentSize, semicolons, singleQuotes, trailingCommas, removeComments]);

  useEffect(() => {
    if (!autoProcess || !input.trim()) return;
    const t = setTimeout(handleProcess, 500);
    return () => clearTimeout(t);
  }, [input, autoProcess, handleProcess]);

  useEffect(() => {
    if (input.trim() && output) handleProcess();
  }, [indentSize, semicolons, singleQuotes, trailingCommas, removeComments, mode]);

  useEffect(() => {
    function handler(e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleProcess(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleProcess]);

  function handleClear() { setInput(""); setOutput(""); setError(null); setStats(null); setActiveSample(null); }
  function loadSample(key) { setInput(SAMPLES[key]); setOutput(""); setError(null); setStats(null); setActiveSample(key); }

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars · ${input.split("\n").length} lines`   : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars · ${output.split("\n").length} lines` : null;

  return (
    <div className="space-y-4">

      {/* Mode selector */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
        {[
          { value: "format", label: "Format / Beautify", Icon: Braces    },
          { value: "minify", label: "Minify",             Icon: Minimize2 },
        ].map((m) => (
          <button
            key={m.value}
            onClick={() => { setMode(m.value); setOutput(""); setError(null); setStats(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
              mode === m.value ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <m.Icon size={15} />
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Prettier notice */}
      {mode === "format" && <PrettierNotice />}

      {/* Options toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleProcess}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <Zap size={15} />
          {mode === "minify" ? "Minify JS" : "Format JS"}
        </button>

        {mode === "format" && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Indent:</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                {INDENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setIndentSize(opt.value)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      indentSize === opt.value ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Toggle checked={semicolons}     onChange={setSemicolons}     label="Semicolons"      description="Keep semicolons at end of statements" />
            <Toggle checked={singleQuotes}   onChange={setSingleQuotes}   label="Single quotes"   description="Convert double quotes to single quotes" />
            <Toggle checked={trailingCommas} onChange={setTrailingCommas} label="Trailing commas" description="Add trailing commas in multiline contexts" />
            <Toggle checked={removeComments} onChange={setRemoveComments} label="Remove comments" description="Strip all comments from output" />
          </>
        )}

        <Toggle checked={showLines}    onChange={setShowLines}    label="Line numbers" description="Show line numbers in output panel" />
        <Toggle checked={autoProcess}  onChange={setAutoProcess}  label="Auto process" description="Process automatically as you type" />
        <Toggle checked={showAnalysis} onChange={setShowAnalysis} label="Analysis"     description="Show code analysis panel" />

        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {[
            { key: "modern", label: "React component" },
            { key: "class",  label: "ES6 class"       },
            { key: "async",  label: "Async/await"     },
            { key: "utils",  label: "Utilities"       },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => loadSample(key)}
              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors whitespace-nowrap ${
                activeSample === key ? "bg-blue-50 border-blue-200 text-blue-700" : "text-blue-600 hover:bg-blue-50 border-blue-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
        </div>
      </div>

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
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <Trash2 size={12} />Clear
                </button>
              )
            }
          />
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
            placeholder={`Paste JavaScript to ${mode}...`}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[400px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader
            label={mode === "minify" ? "Minified JS" : "Formatted JS"}
            meta={outputMeta}
            actions={
              <>
                {output && <CopyButton text={output} />}
                {output && (
                  <button
                    onClick={() => downloadText(output, mode === "minify" ? "minified.js" : "formatted.js", "application/javascript")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <Download size={12} />Download
                  </button>
                )}
              </>
            }
          />
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[400px] relative">
            {output && showLines && mode === "format" && <LineNumbers text={output} />}
            {output ? (
              <textarea
                value={output}
                readOnly
                spellCheck={false}
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[400px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-300">
                  {mode === "minify" ? "Minified JS appears here" : "Formatted JS appears here"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      {stats && mode === "format" && <StatsBar stats={stats} />}
      {stats && mode === "minify" && <SizeComparison original={input} minified={output} />}
      {showAnalysis && input.trim() && <JsAnalysisPanel src={output || input} />}
    </div>
  );
}