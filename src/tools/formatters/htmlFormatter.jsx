"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  FileCode,
  Minimize2,
  Zap,
  Copy,
  Check,
  Download,
  Trash2,
  AlertCircle,
  ArrowUp,
} from "lucide-react";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// HTML FORMATTER ENGINE
// ============================================================

const VOID_ELEMENTS = new Set([
  "area","base","br","col","embed","hr","img","input",
  "link","meta","param","source","track","wbr",
]);

const INLINE_ELEMENTS = new Set([
  "a","abbr","acronym","b","bdo","big","br","button","cite",
  "code","dfn","em","i","img","input","kbd","label","map",
  "object","output","q","s","samp","select","small","span",
  "strong","sub","sup","textarea","time","tt","u","var",
]);

const RAW_TEXT_ELEMENTS = new Set(["script","style"]);

function formatHtml(raw, options = {}) {
  const {
    indentSize       = 2,
    useTabs          = false,
    maxLineLength    = 120,
    preserveComments = true,
    sortAttributes   = false,
    wrapAttributes   = false,
    removeComments   = false,
  } = options;

  if (!raw || !raw.trim()) {
    return { success: false, output: "", error: "Input is empty." };
  }

  const indent = useTabs ? "\t" : " ".repeat(indentSize);

  try {
    const tokens  = tokenizeHtml(raw.trim());
    const output  = renderTokens(tokens, {
      indent, maxLineLength, preserveComments,
      sortAttributes, wrapAttributes, removeComments,
    });

    return {
      success: true,
      output,
      stats: {
        inputLength:  raw.length,
        outputLength: output.length,
        inputLines:   raw.trim().split("\n").length,
        outputLines:  output.split("\n").length,
        tokenCount:   tokens.length,
      },
    };
  } catch (e) {
    return { success: false, output: "", error: `Parse error: ${e.message}` };
  }
}

function tokenizeHtml(html) {
  const tokens = [];
  let i = 0;

  while (i < html.length) {
    if (html.slice(i, i + 9).toUpperCase() === "<!DOCTYPE") {
      const end = html.indexOf(">", i);
      if (end === -1) throw new Error("Unclosed DOCTYPE declaration.");
      tokens.push({ type: "doctype", value: html.slice(i, end + 1) });
      i = end + 1; continue;
    }
    if (html.slice(i, i + 4) === "<!--") {
      const end = html.indexOf("-->", i + 4);
      if (end === -1) throw new Error("Unclosed HTML comment.");
      tokens.push({ type: "comment", value: html.slice(i, end + 3) });
      i = end + 3; continue;
    }
    if (html.slice(i, i + 9) === "<![CDATA[") {
      const end = html.indexOf("]]>", i + 9);
      if (end === -1) throw new Error("Unclosed CDATA section.");
      tokens.push({ type: "cdata", value: html.slice(i, end + 3) });
      i = end + 3; continue;
    }
    if (html.slice(i, i + 2) === "</") {
      const end = html.indexOf(">", i);
      if (end === -1) throw new Error(`Unclosed closing tag at position ${i}.`);
      const raw = html.slice(i, end + 1);
      const tag = raw.slice(2, -1).trim().toLowerCase();
      tokens.push({ type: "close", tag, value: raw });
      i = end + 1; continue;
    }
    if (html[i] === "<" && i + 1 < html.length && /[a-zA-Z!?]/.test(html[i + 1])) {
      const tagInfo = parseOpenTag(html, i);
      if (!tagInfo) { tokens.push({ type: "text", value: html[i] }); i++; continue; }
      const { tag, attrs, selfClose, endIndex } = tagInfo;
      const tagLower = tag.toLowerCase();
      if (selfClose || VOID_ELEMENTS.has(tagLower)) {
        tokens.push({ type: "void", tag: tagLower, attrs, value: html.slice(i, endIndex + 1) });
      } else if (RAW_TEXT_ELEMENTS.has(tagLower)) {
        const closeTag = `</${tagLower}`;
        const closeIdx = html.toLowerCase().indexOf(closeTag, endIndex + 1);
        const content  = closeIdx === -1 ? html.slice(endIndex + 1) : html.slice(endIndex + 1, closeIdx);
        tokens.push({ type: "rawtext", tag: tagLower, attrs, content: content.trim(), value: html.slice(i, closeIdx === -1 ? html.length : closeIdx + closeTag.length + 1) });
        i = closeIdx === -1 ? html.length : closeIdx + closeTag.length + 1;
        continue;
      } else {
        tokens.push({ type: "open", tag: tagLower, attrs, value: html.slice(i, endIndex + 1) });
      }
      i = endIndex + 1; continue;
    }
    const nextTag = html.indexOf("<", i);
    const text    = nextTag === -1 ? html.slice(i) : html.slice(i, nextTag);
    if (text.trim()) tokens.push({ type: "text", value: text });
    i = nextTag === -1 ? html.length : nextTag;
  }

  return tokens;
}

function parseOpenTag(html, start) {
  let i = start + 1;
  let tag = "";
  while (i < html.length && /[a-zA-Z0-9\-_:]/.test(html[i])) tag += html[i++];
  if (!tag) return null;
  const attrs = [];
  let selfClose = false;

  while (i < html.length && html[i] !== ">") {
    while (i < html.length && /\s/.test(html[i])) i++;
    if (html[i] === "/" && html[i + 1] === ">") {
      selfClose = true; i += 2;
      return { tag, attrs, selfClose, endIndex: i - 1 };
    }
    if (html[i] === ">") break;
    let attrName = "";
    while (i < html.length && !/[\s=/>]/.test(html[i])) attrName += html[i++];
    if (!attrName) { i++; continue; }
    while (i < html.length && /\s/.test(html[i])) i++;
    if (html[i] === "=") {
      i++;
      while (i < html.length && /\s/.test(html[i])) i++;
      let attrVal = "";
      const quote = html[i];
      if (quote === '"' || quote === "'") {
        i++;
        while (i < html.length && html[i] !== quote) attrVal += html[i++];
        i++;
        attrs.push({ name: attrName, value: attrVal, quote });
      } else {
        while (i < html.length && !/[\s>]/.test(html[i])) attrVal += html[i++];
        attrs.push({ name: attrName, value: attrVal, quote: '"' });
      }
    } else {
      attrs.push({ name: attrName, value: null, quote: null });
    }
  }
  if (html[i] === ">") return { tag, attrs, selfClose: false, endIndex: i };
  return null;
}

function renderTokens(tokens, opts) {
  const { indent, sortAttributes, preserveComments, removeComments } = opts;
  let output = "";
  let depth  = 0;

  function pad(d = depth) { return indent.repeat(Math.max(0, d)); }

  function renderAttrs(attrs) {
    if (!attrs || attrs.length === 0) return "";
    const sorted = sortAttributes ? [...attrs].sort((a, b) => a.name.localeCompare(b.name)) : attrs;
    return sorted.map((a) => a.value === null ? ` ${a.name}` : ` ${a.name}=${a.quote}${a.value}${a.quote}`).join("");
  }

  for (const token of tokens) {
    switch (token.type) {
      case "doctype":
        output += `${pad()}${token.value}\n`;
        break;
      case "comment":
        if (removeComments || !preserveComments) break;
        if (token.value.includes("\n")) {
          const lines = token.value.split("\n").map((l) => l.trim()).filter(Boolean);
          output += `${pad()}${lines.join(`\n${pad()}`)}\n`;
        } else {
          output += `${pad()}${token.value.trim()}\n`;
        }
        break;
      case "cdata":
        output += `${pad()}${token.value}\n`;
        break;
      case "open": {
        const attrStr = renderAttrs(token.attrs);
        output += `${pad()}<${token.tag}${attrStr}>\n`;
        if (!INLINE_ELEMENTS.has(token.tag)) depth++;
        break;
      }
      case "close": {
        if (!INLINE_ELEMENTS.has(token.tag)) depth = Math.max(0, depth - 1);
        output += `${pad()}</${token.tag}>\n`;
        break;
      }
      case "void": {
        const attrStr = renderAttrs(token.attrs);
        output += `${pad()}<${token.tag}${attrStr}>\n`;
        break;
      }
      case "rawtext": {
        const attrStr = renderAttrs(token.attrs);
        output += `${pad()}<${token.tag}${attrStr}>\n`;
        if (token.content) {
          const lines = token.content.split("\n");
          const innerDepth = depth + 1;
          lines.forEach((line) => { const trimmed = line.trim(); if (trimmed) output += `${pad(innerDepth)}${trimmed}\n`; });
        }
        output += `${pad()}</${token.tag}>\n`;
        break;
      }
      case "text": {
        const trimmed = token.value.trim().replace(/\s+/g, " ");
        if (trimmed) output += `${pad()}${trimmed}\n`;
        break;
      }
    }
  }

  return output.trimEnd();
}

function minifyHtml(raw) {
  if (!raw.trim()) return { success: false, output: "", error: "Input is empty." };
  try {
    const result = raw
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><")
      .replace(/\s+>/g, ">")
      .replace(/<\s+/g, "<")
      .trim();
    return {
      success: true, output: result,
      stats: { inputLength: raw.length, outputLength: result.length, saved: raw.length - result.length, savedPct: Math.round(((raw.length - result.length) / raw.length) * 100) },
    };
  } catch (e) {
    return { success: false, output: "", error: e.message };
  }
}

// ============================================================
// CONSTANTS
// ============================================================

const SAMPLES = {
  basic:      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Sample Page</title><link rel="stylesheet" href="styles.css"></head><body><header class="site-header"><nav class="nav"><a href="/" class="nav__logo">DevTools</a><ul class="nav__links"><li><a href="/tools">Tools</a></li><li><a href="/docs">Docs</a></li><li><a href="/about">About</a></li></ul></nav></header><main class="container"><section class="hero"><h1 class="hero__title">Free Developer Tools</h1><p class="hero__desc">70+ tools for developers</p><a href="/tools" class="btn btn--primary">Get Started</a></section></main><footer><p>&copy; 2024 DevTools. All rights reserved.</p></footer></body></html>`,
  withScript: `<!DOCTYPE html><html><head><title>App</title><style>body{margin:0;font-family:sans-serif}.container{max-width:1200px;margin:0 auto}</style></head><body><div class="container"><h1>Hello World</h1><p id="message">Loading...</p></div><script>document.addEventListener("DOMContentLoaded",function(){const el=document.getElementById("message");el.textContent="Page loaded!";el.style.color="green"});</script></body></html>`,
  form:       `<form class="login-form" action="/login" method="POST" novalidate><div class="form-group"><label for="email" class="form-label">Email Address</label><input type="email" id="email" name="email" class="form-control" placeholder="you@example.com" required autocomplete="email"></div><div class="form-group"><label for="password" class="form-label">Password</label><input type="password" id="password" name="password" class="form-control" placeholder="Min 8 characters" required autocomplete="current-password"><button type="button" class="btn-toggle-pass" aria-label="Show password">Show</button></div><div class="form-group form-group--checkbox"><input type="checkbox" id="remember" name="remember"><label for="remember">Remember me for 30 days</label></div><button type="submit" class="btn btn--primary btn--full">Sign In</button><p class="form-footer">Don't have an account? <a href="/signup">Sign up free</a></p></form>`,
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

function LineNumbers({ text, visible }) {
  if (!visible || !text) return null;
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

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function HtmlFormatter() {
  const [input,          setInput]          = useState("");
  const [output,         setOutput]         = useState("");
  const [error,          setError]          = useState(null);
  const [stats,          setStats]          = useState(null);
  const [mode,           setMode]           = useState("format");
  const [indentSize,     setIndentSize]     = useState(2);
  const [sortAttrs,      setSortAttrs]      = useState(false);
  const [removeComments, setRemoveComments] = useState(false);
  const [showLines,      setShowLines]      = useState(true);
  const [autoProcess,    setAutoProcess]    = useState(false);
  const [activeSample,   setActiveSample]   = useState(null);
  const outputRef = useRef(null);

  const handleProcess = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) { setError("Please enter HTML to process."); setOutput(""); setStats(null); return; }
    if (mode === "minify") {
      const result = minifyHtml(trimmed);
      if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
      else { setOutput(""); setError(result.error); setStats(null); }
    } else {
      const result = formatHtml(trimmed, { indentSize: indentSize === "tab" ? 2 : indentSize, useTabs: indentSize === "tab", sortAttributes: sortAttrs, removeComments });
      if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
      else { setOutput(""); setError(result.error); setStats(null); }
    }
  }, [input, mode, indentSize, sortAttrs, removeComments]);

  useEffect(() => {
    if (!autoProcess || !input.trim()) return;
    const t = setTimeout(handleProcess, 400);
    return () => clearTimeout(t);
  }, [input, autoProcess, handleProcess]);

  useEffect(() => {
    if (input.trim() && output) handleProcess();
  }, [indentSize, sortAttrs, removeComments, mode]);

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
          { value: "format", label: "Format / Beautify", Icon: FileCode  },
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

      {/* Options toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleProcess}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <Zap size={15} />
          {mode === "minify" ? "Minify HTML" : "Format HTML"}
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
            <Toggle checked={sortAttrs}      onChange={setSortAttrs}      label="Sort attributes"  description="Sort tag attributes alphabetically" />
            <Toggle checked={removeComments} onChange={setRemoveComments} label="Remove comments"  description="Strip all HTML comments from output" />
          </>
        )}

        <Toggle checked={showLines}   onChange={setShowLines}   label="Line numbers" description="Show line numbers in output" />
        <Toggle checked={autoProcess} onChange={setAutoProcess} label="Auto process" description="Process automatically as you type" />

        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {[
            { key: "basic",      label: "Basic page"   },
            { key: "withScript", label: "With scripts" },
            { key: "form",       label: "Form"         },
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
            label="HTML Input"
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
            placeholder={`Paste HTML to ${mode}...\n\n<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <title>Page</title>\n  </head>\n  <body>\n    <h1>Hello World</h1>\n  </body>\n</html>`}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[380px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader
            label={mode === "minify" ? "Minified HTML" : "Formatted HTML"}
            meta={outputMeta}
            actions={
              <>
                {output && <CopyButton text={output} />}
                {output && (
                  <button
                    onClick={() => downloadText(output, mode === "minify" ? "minified.html" : "formatted.html", "text/html")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <Download size={12} />Download
                  </button>
                )}
              </>
            }
          />
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[380px] relative">
            {output && showLines && mode === "format" && <LineNumbers text={output} visible={showLines} />}
            {output ? (
              <textarea
                ref={outputRef}
                value={output}
                readOnly
                spellCheck={false}
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[380px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-300">
                  {mode === "minify" ? "Minified HTML appears here" : "Formatted HTML appears here"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      {stats && mode === "format" && <StatsBar stats={stats} />}
      {stats && mode === "minify" && <SizeComparison original={input} minified={output} />}
    </div>
  );
}