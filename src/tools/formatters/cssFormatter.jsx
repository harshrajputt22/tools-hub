"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Wand2,
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
// CSS FORMATTER ENGINE
// ============================================================

const TOKEN_TYPES = {
  COMMENT:     "COMMENT",
  OPEN_BRACE:  "OPEN_BRACE",
  CLOSE_BRACE: "CLOSE_BRACE",
  COLON:       "COLON",
  SEMICOLON:   "SEMICOLON",
  WHITESPACE:  "WHITESPACE",
  VALUE:       "VALUE",
};

function tokenizeCss(css) {
  const tokens = [];
  let i = 0;

  while (i < css.length) {
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      if (end === -1) throw new Error("Unclosed CSS comment.");
      tokens.push({ type: TOKEN_TYPES.COMMENT, value: css.slice(i, end + 2) });
      i = end + 2;
      continue;
    }
    if (css[i] === "/" && css[i + 1] === "/") {
      const end = css.indexOf("\n", i);
      const val = end === -1 ? css.slice(i) : css.slice(i, end);
      tokens.push({ type: TOKEN_TYPES.COMMENT, value: val });
      i = end === -1 ? css.length : end + 1;
      continue;
    }
    if (css[i] === "{") { tokens.push({ type: TOKEN_TYPES.OPEN_BRACE,  value: "{" }); i++; continue; }
    if (css[i] === "}") { tokens.push({ type: TOKEN_TYPES.CLOSE_BRACE, value: "}" }); i++; continue; }
    if (css[i] === ";") { tokens.push({ type: TOKEN_TYPES.SEMICOLON,   value: ";" }); i++; continue; }
    if (css[i] === ":") { tokens.push({ type: TOKEN_TYPES.COLON,       value: ":" }); i++; continue; }
    if (css[i] === '"' || css[i] === "'") {
      const quote = css[i];
      let str = quote;
      i++;
      while (i < css.length && css[i] !== quote) {
        if (css[i] === "\\" && i + 1 < css.length) { str += css[i] + css[i + 1]; i += 2; }
        else { str += css[i++]; }
      }
      str += quote; i++;
      tokens.push({ type: TOKEN_TYPES.VALUE, value: str });
      continue;
    }
    if (/\s/.test(css[i])) {
      let ws = "";
      while (i < css.length && /\s/.test(css[i])) ws += css[i++];
      tokens.push({ type: TOKEN_TYPES.WHITESPACE, value: ws });
      continue;
    }
    let raw = "";
    while (
      i < css.length &&
      css[i] !== "{" && css[i] !== "}" && css[i] !== ";" && css[i] !== ":" &&
      !(css[i] === "/" && (css[i + 1] === "*" || css[i + 1] === "/")) &&
      !/\s/.test(css[i])
    ) { raw += css[i++]; }
    if (raw) tokens.push({ type: TOKEN_TYPES.VALUE, value: raw });
  }
  return tokens;
}

function parseCss(tokens) {
  const nodes = [];
  let i = 0;

  function skipWhitespace() {
    while (i < tokens.length && tokens[i].type === TOKEN_TYPES.WHITESPACE) i++;
  }

  while (i < tokens.length) {
    skipWhitespace();
    if (i >= tokens.length) break;
    const tok = tokens[i];
    if (tok.type === TOKEN_TYPES.COMMENT) {
      nodes.push({ type: "comment", value: tok.value });
      i++; continue;
    }
    const rawParts = [];
    while (
      i < tokens.length &&
      tokens[i].type !== TOKEN_TYPES.OPEN_BRACE &&
      tokens[i].type !== TOKEN_TYPES.CLOSE_BRACE &&
      tokens[i].type !== TOKEN_TYPES.COMMENT
    ) { rawParts.push(tokens[i]); i++; }
    const rawText = rawParts.map((t) => t.value).join("").trim();
    if (!rawText) continue;
    if (i < tokens.length && tokens[i].type === TOKEN_TYPES.OPEN_BRACE) {
      i++;
      const isAtRule = rawText.startsWith("@");
      const isNestedAtRule = isAtRule && /^@(media|supports|keyframes|layer|container|document|page|font-face)/i.test(rawText);
      if (isNestedAtRule && !rawText.startsWith("@keyframes") && !rawText.startsWith("@font-face")) {
        const innerTokens = [];
        let braceDepth = 1;
        while (i < tokens.length && braceDepth > 0) {
          if (tokens[i].type === TOKEN_TYPES.OPEN_BRACE)  braceDepth++;
          if (tokens[i].type === TOKEN_TYPES.CLOSE_BRACE) braceDepth--;
          if (braceDepth > 0) innerTokens.push(tokens[i]);
          i++;
        }
        nodes.push({ type: "at-rule-block", selector: rawText, children: parseCss(innerTokens) });
      } else {
        const declarations = [];
        let pendingComment = null;
        while (i < tokens.length && tokens[i].type !== TOKEN_TYPES.CLOSE_BRACE) {
          if (tokens[i].type === TOKEN_TYPES.WHITESPACE) { i++; continue; }
          if (tokens[i].type === TOKEN_TYPES.COMMENT) { pendingComment = tokens[i].value; i++; continue; }
          const propParts = [];
          while (
            i < tokens.length &&
            tokens[i].type !== TOKEN_TYPES.COLON &&
            tokens[i].type !== TOKEN_TYPES.SEMICOLON &&
            tokens[i].type !== TOKEN_TYPES.CLOSE_BRACE &&
            tokens[i].type !== TOKEN_TYPES.OPEN_BRACE &&
            tokens[i].type !== TOKEN_TYPES.COMMENT
          ) { propParts.push(tokens[i]); i++; }
          const prop = propParts.filter((t) => t.type !== TOKEN_TYPES.WHITESPACE).map((t) => t.value).join("").trim();
          if (!prop) { i++; continue; }
          if (i < tokens.length && tokens[i].type === TOKEN_TYPES.COLON) i++;
          const valParts = [];
          let parenDepth = 0;
          while (i < tokens.length) {
            const t = tokens[i];
            if (t.type === TOKEN_TYPES.SEMICOLON && parenDepth === 0) break;
            if (t.type === TOKEN_TYPES.CLOSE_BRACE && parenDepth === 0) break;
            if (t.type === TOKEN_TYPES.COMMENT) break;
            if (t.value === "(") parenDepth++;
            if (t.value === ")") parenDepth--;
            valParts.push(t); i++;
          }
          const val = valParts.map((t) => t.value).join("").trim();
          if (i < tokens.length && tokens[i].type === TOKEN_TYPES.SEMICOLON) i++;
          if (prop) { declarations.push({ property: prop, value: val, comment: pendingComment }); pendingComment = null; }
        }
        if (i < tokens.length && tokens[i].type === TOKEN_TYPES.CLOSE_BRACE) i++;
        nodes.push({ type: isAtRule ? "at-rule-declarations" : "rule", selector: rawText, declarations });
      }
    }
  }
  return nodes;
}

function renderCss(nodes, opts = {}) {
  const { indent = "  ", depth = 0, sortProperties = false, removeComments = false } = opts;
  const pad  = indent.repeat(depth);
  const pad1 = indent.repeat(depth + 1);
  let out = "";

  function formatValue(val) {
    if (!val) return val;
    let v = val.replace(/\s+/g, " ").trim();
    v = v.replace(/\b0(px|em|rem|%|pt|pc|ex|ch|vw|vh|vmin|vmax|cm|mm|in)\b/g, "0");
    v = v.replace(/\b(red|blue|green|white|black|gray|grey|transparent|inherit|initial|unset)\b/gi, (m) => m.toLowerCase());
    return v;
  }

  for (let idx = 0; idx < nodes.length; idx++) {
    const node   = nodes[idx];
    const isLast = idx === nodes.length - 1;
    switch (node.type) {
      case "comment": {
        if (removeComments) break;
        const lines = node.value.split("\n");
        out += lines.length === 1
          ? `${pad}${node.value.trim()}\n`
          : lines.map((l, li) => li === 0 ? `${pad}${l.trim()}` : `${pad} ${l.trim()}`).join("\n") + "\n";
        break;
      }
      case "rule":
      case "at-rule-declarations": {
        const selector = node.selector.trim();
        const selectors = selector.includes(",")
          ? selector.split(",").map((s) => s.trim()).join(`,\n${pad}`)
          : selector;
        let decls = node.declarations || [];
        if (sortProperties) decls = [...decls].sort((a, b) => a.property.localeCompare(b.property));
        if (decls.length === 0) {
          out += `${pad}${selectors} {}\n`;
        } else {
          out += `${pad}${selectors} {\n`;
          for (const decl of decls) {
            if (decl.comment && !removeComments) out += `${pad1}${decl.comment.trim()}\n`;
            out += `${pad1}${decl.property}: ${formatValue(decl.value)};\n`;
          }
          out += `${pad}}\n`;
        }
        if (!isLast && nodes[idx + 1]?.type !== "comment") out += "\n";
        break;
      }
      case "at-rule-block": {
        out += `${pad}${node.selector.trim()} {\n`;
        out += renderCss(node.children, { ...opts, depth: depth + 1 });
        out += `${pad}}\n`;
        if (!isLast) out += "\n";
        break;
      }
    }
  }
  return out;
}

function countNodes(nodes, type) {
  return nodes.reduce((acc, n) => {
    if (n.type === type) acc++;
    if (n.children) acc += countNodes(n.children, type);
    return acc;
  }, 0);
}

function countDeclarations(nodes) {
  return nodes.reduce((acc, n) => {
    if (n.declarations) acc += n.declarations.length;
    if (n.children)     acc += countDeclarations(n.children);
    return acc;
  }, 0);
}

function formatCss(raw, options = {}) {
  const { indentSize = 2, useTabs = false, sortProperties = false, removeComments = false } = options;
  if (!raw || !raw.trim()) return { success: false, output: "", error: "Input is empty." };
  const indent = useTabs ? "\t" : " ".repeat(indentSize);
  try {
    const tokens = tokenizeCss(raw.trim());
    const nodes  = parseCss(tokens);
    const output = renderCss(nodes, { indent, sortProperties, removeComments }).trimEnd();
    return {
      success: true, output,
      stats: {
        inputLength:  raw.length,
        outputLength: output.length,
        inputLines:   raw.split("\n").length,
        outputLines:  output.split("\n").length,
        rules:        countNodes(nodes, "rule") + countNodes(nodes, "at-rule-declarations"),
        atRules:      countNodes(nodes, "at-rule-block"),
        properties:   countDeclarations(nodes),
      },
    };
  } catch (e) {
    return { success: false, output: "", error: `Parse error: ${e.message}` };
  }
}

function minifyCss(raw) {
  if (!raw.trim()) return { success: false, output: "", error: "Input is empty." };
  try {
    const result = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*{\s*/g, "{")
      .replace(/\s*}\s*/g, "}")
      .replace(/\s*:\s*/g, ":")
      .replace(/\s*;\s*/g, ";")
      .replace(/\s*,\s*/g, ",")
      .replace(/;}/g, "}")
      .replace(/0\.(0*)([1-9])/g, ".$2")
      .replace(/\b0(px|em|rem|%|pt|pc|ex|ch|vw|vh|vmin|vmax|cm|mm|in)\b/g, "0")
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
// SAMPLES
// ============================================================

const SAMPLES = {
  basic:      `.container{max-width:1280px;margin:0 auto;padding:0 16px}.header{background:#ffffff;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:40}.nav{display:flex;align-items:center;justify-content:space-between;height:64px}.nav__logo{font-size:1.25rem;font-weight:700;color:#1d4ed8;text-decoration:none}.btn{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;font-size:0.875rem;font-weight:600;border-radius:8px;cursor:pointer;transition:all 200ms}.btn--primary{background:#2563eb;color:#ffffff;border:none}.btn--primary:hover{background:#1d4ed8;transform:translateY(-1px)}`,
  mediaQuery: `body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:0;background:#f9fafb}.hero{padding:80px 20px;text-align:center}.hero__title{font-size:3rem;font-weight:800;color:#111827;margin-bottom:16px}@media (max-width:768px){.hero{padding:40px 16px}.hero__title{font-size:2rem}}@media (max-width:480px){.hero{padding:24px 12px}.hero__title{font-size:1.5rem}}@media (prefers-color-scheme:dark){body{background:#111827;color:#f9fafb}.hero__title{color:#ffffff}}`,
  animations: `@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}.animate-fade-in{animation:fadeIn 300ms ease forwards}.animate-spin{animation:spin 700ms linear infinite}.animate-pulse{animation:pulse 2s ease-in-out infinite}`,
  variables:  `:root{--color-primary:210 100% 56%;--color-secondary:221 83% 53%;--color-success:142 71% 45%;--radius-sm:4px;--radius-md:8px;--radius-lg:12px;--shadow-sm:0 1px 2px rgba(0,0,0,0.05);--shadow-md:0 4px 6px -1px rgba(0,0,0,0.1)}.card{background:white;border-radius:var(--radius-lg);box-shadow:var(--shadow-md);padding:24px}.badge{display:inline-flex;align-items:center;padding:2px 10px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:600}`,
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
      <div className="flex items-center gap-2">
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
        { label: "Input",      value: `${stats.inputLength?.toLocaleString()} chars`  },
        { label: "Output",     value: `${stats.outputLength?.toLocaleString()} chars` },
        { label: "Lines",      value: stats.outputLines?.toLocaleString()              },
        { label: "Rules",      value: stats.rules?.toLocaleString()                    },
        { label: "At-rules",   value: stats.atRules?.toLocaleString()                  },
        { label: "Properties", value: stats.properties?.toLocaleString()               },
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
          { label: "Original", size: original.length,  pct: 100,     color: "bg-gray-400"  },
          { label: "Minified", size: minified.length,  pct: miniPct, color: "bg-green-500" },
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

function analyzeCss(css) {
  const selectors    = (css.match(/[^{}]+(?=\s*\{)/g) || []).filter((s) => !s.trim().startsWith("@")).length;
  const declarations = (css.match(/[\w-]+\s*:/g) || []).length;
  const mediaQueries = (css.match(/@media/gi) || []).length;
  const keyframes    = (css.match(/@keyframes/gi) || []).length;
  const variables    = (css.match(/--[\w-]+\s*:/g) || []).length;
  const comments     = (css.match(/\/\*[\s\S]*?\*\//g) || []).length;
  const colors       = new Set((css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) || []).map((c) => c.toLowerCase())).size;
  const propMatches  = css.match(/(?<![^;{}])([\w-]+)\s*:/g) || [];
  const propCounts   = {};
  for (const m of propMatches) {
    const prop = m.replace(/\s*:$/, "").trim();
    if (!prop.startsWith("--") && /^[a-z]/.test(prop)) propCounts[prop] = (propCounts[prop] || 0) + 1;
  }
  const topProperties = Object.entries(propCounts).map(([prop, count]) => ({ prop, count })).sort((a, b) => b.count - a.count);
  return { selectors, declarations, mediaQueries, keyframes, variables, comments, colors, uniqueProps: Object.keys(propCounts).length, topProperties };
}

function CssAnalyzer({ cssText }) {
  if (!cssText.trim()) return null;
  const analysis = analyzeCss(cssText);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">CSS Analysis</span>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Selectors",     value: analysis.selectors,    color: "text-blue-600"   },
          { label: "Declarations",  value: analysis.declarations, color: "text-green-600"  },
          { label: "Media queries", value: analysis.mediaQueries, color: "text-purple-600" },
          { label: "Keyframes",     value: analysis.keyframes,    color: "text-orange-600" },
          { label: "Variables",     value: analysis.variables,    color: "text-indigo-600" },
          { label: "Comments",      value: analysis.comments,     color: "text-gray-500"   },
          { label: "Unique props",  value: analysis.uniqueProps,  color: "text-teal-600"   },
          { label: "Colors used",   value: analysis.colors,       color: "text-rose-600"   },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col gap-0.5 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
            <span className="text-xs text-gray-400 font-medium">{label}</span>
            <span className={`text-lg font-bold font-mono ${color}`}>{value}</span>
          </div>
        ))}
      </div>
      {analysis.topProperties.length > 0 && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-3">Most used properties</p>
          <div className="space-y-1.5">
            {analysis.topProperties.slice(0, 8).map(({ prop, count: cnt }) => (
              <div key={prop} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-600 w-40 flex-shrink-0 truncate">{prop}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, (cnt / analysis.topProperties[0].count) * 100)}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{cnt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CssFormatter() {
  const [input,          setInput]          = useState("");
  const [output,         setOutput]         = useState("");
  const [error,          setError]          = useState(null);
  const [stats,          setStats]          = useState(null);
  const [mode,           setMode]           = useState("format");
  const [indentSize,     setIndentSize]     = useState(2);
  const [sortProperties, setSortProperties] = useState(false);
  const [removeComments, setRemoveComments] = useState(false);
  const [showLines,      setShowLines]      = useState(true);
  const [showAnalysis,   setShowAnalysis]   = useState(false);
  const [autoProcess,    setAutoProcess]    = useState(false);
  const [activeSample,   setActiveSample]   = useState(null);

  const handleProcess = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) { setError("Please enter CSS to process."); setOutput(""); setStats(null); return; }
    if (mode === "minify") {
      const result = minifyCss(trimmed);
      if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
      else { setOutput(""); setError(result.error); setStats(null); }
    } else {
      const result = formatCss(trimmed, { indentSize: indentSize === "tab" ? 2 : indentSize, useTabs: indentSize === "tab", sortProperties, removeComments });
      if (result.success) { setOutput(result.output); setError(null); setStats(result.stats); }
      else { setOutput(""); setError(result.error); setStats(null); }
    }
  }, [input, mode, indentSize, sortProperties, removeComments]);

  useEffect(() => {
    if (!autoProcess || !input.trim()) return;
    const t = setTimeout(handleProcess, 400);
    return () => clearTimeout(t);
  }, [input, autoProcess, handleProcess]);

  useEffect(() => {
    if (input.trim() && output) handleProcess();
  }, [indentSize, sortProperties, removeComments, mode]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleProcess();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleProcess]);

  function handleClear() {
    setInput(""); setOutput(""); setError(null); setStats(null); setActiveSample(null);
  }

  function loadSample(key) {
    setInput(SAMPLES[key]); setOutput(""); setError(null); setStats(null); setActiveSample(key);
  }

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars · ${input.split("\n").length} lines`   : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars · ${output.split("\n").length} lines` : null;

  return (
    <div className="space-y-4">

      {/* Mode selector */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
        {[
          { value: "format", label: "Format / Beautify", Icon: Wand2    },
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
          {mode === "minify" ? "Minify CSS" : "Format CSS"}
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
            <Toggle checked={sortProperties} onChange={setSortProperties} label="Sort properties"  description="Sort CSS properties alphabetically" />
            <Toggle checked={removeComments} onChange={setRemoveComments} label="Remove comments"  description="Strip all CSS comments from output" />
          </>
        )}

        <Toggle checked={showLines}    onChange={setShowLines}    label="Line numbers" description="Show line numbers in output" />
        <Toggle checked={autoProcess}  onChange={setAutoProcess}  label="Auto process" description="Process automatically as you type" />
        <Toggle checked={showAnalysis} onChange={setShowAnalysis} label="Analysis"     description="Show CSS analysis panel" />

        {/* Sample buttons */}
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {[
            { key: "basic",      label: "Components"    },
            { key: "mediaQuery", label: "Media queries" },
            { key: "animations", label: "Animations"    },
            { key: "variables",  label: "Variables"     },
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
            label="CSS Input"
            meta={inputMeta}
            actions={
              input && (
                <button
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              )
            }
          />
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
            placeholder={`Paste CSS to ${mode}...\n\n.container {\n  max-width: 1280px;\n  margin: 0 auto;\n}`}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[380px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader
            label={mode === "minify" ? "Minified CSS" : "Formatted CSS"}
            meta={outputMeta}
            actions={
              <>
                {output && <CopyButton text={output} />}
                {output && (
                  <button
                    onClick={() => downloadText(output, mode === "minify" ? "minified.css" : "formatted.css", "text/css")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <Download size={12} />
                    Download
                  </button>
                )}
              </>
            }
          />
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[380px] relative">
            {output && showLines && mode === "format" && <LineNumbers text={output} />}
            {output ? (
              <textarea
                value={output}
                readOnly
                spellCheck={false}
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[380px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-300">
                  {mode === "minify" ? "Minified CSS appears here" : "Formatted CSS appears here"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Stats */}
      {stats && mode === "format" && <StatsBar stats={stats} />}

      {/* Size comparison */}
      {stats && mode === "minify" && <SizeComparison original={input} minified={output} />}

      {/* CSS Analysis */}
      {showAnalysis && input.trim() && <CssAnalyzer cssText={output || input} />}
    </div>
  );
}